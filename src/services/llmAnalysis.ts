export interface AnalysisResult {
  systolic: number;
  diastolic: number;
  pulse: number;
  timestamp: string;
  confidence: number;
  notes?: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';

export const llmAnalysisService = {
  async analyzeBloodPressureImage(imageUri: string): Promise<AnalysisResult> {
    try {
      const base64Image = await this.convertImageToBase64(imageUri);
      
      if (OPENAI_API_KEY) {
        return await this.analyzeWithOpenAI(base64Image);
      } else if (ANTHROPIC_API_KEY) {
        return await this.analyzeWithAnthropic(base64Image);
      } else {
        throw new Error('No LLM API key configured');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze blood pressure reading');
    }
  },

  async convertImageToBase64(imageUri: string): Promise<string> {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  async analyzeWithOpenAI(base64Image: string): Promise<AnalysisResult> {
    const prompt = `Analyze this blood pressure monitor display image and extract the following information in JSON format:
    {
      "systolic": number,
      "diastolic": number, 
      "pulse": number,
      "timestamp": "ISO string of current time",
      "confidence": number (0-1),
      "notes": "any relevant observations"
    }
    
    Look for the systolic (top number), diastolic (bottom number), and pulse rate. If any values are unclear or not visible, set confidence accordingly.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText || 'Unknown error';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // Log token usage
    if (data.usage) {
      console.log('OpenAI API Token Usage:', {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      });
    }
    
    try {
      // Sometimes the response includes markdown code blocks, so extract JSON
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      let jsonString = jsonMatch ? jsonMatch[1] : content;
      
      // Remove comments from JSON string
      jsonString = jsonString.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      
      const result = JSON.parse(jsonString);
      // Ensure the timestamp is set to the current time
      result.timestamp = new Date().toISOString();
      // Include usage information in the response
      return { ...result, usage: data.usage };
    } catch (error: unknown) {
      console.error('Error parsing OpenAI response:', error);
      console.error('OpenAI response content:', content);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to parse analysis result: ${errorMessage}`);
    }
  },

  async analyzeWithAnthropic(base64Image: string): Promise<AnalysisResult> {
    const prompt = `Analyze this blood pressure monitor display image and extract the following information in JSON format:
    {
      "systolic": number,
      "diastolic": number, 
      "pulse": number,
      "timestamp": "ISO string of current time",
      "confidence": number (0-1),
      "notes": "any relevant observations"
    }
    
    Look for the systolic (top number), diastolic (bottom number), and pulse rate. If any values are unclear or not visible, set confidence accordingly.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || response.statusText || 'Unknown error';
      throw new Error(`Anthropic API error: ${errorMessage}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    try {
      // Sometimes the response includes markdown code blocks, so extract JSON
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      let jsonString = jsonMatch ? jsonMatch[1] : content;
      
      // Remove comments from JSON string
      jsonString = jsonString.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Anthropic response content:', content);
      console.error('Parse error:', parseError);
      throw new Error(`Failed to parse Anthropic response: ${content}`);
    }
  },
};