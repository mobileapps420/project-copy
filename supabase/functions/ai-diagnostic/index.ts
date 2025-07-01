import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface DiagnosticRequest {
  sessionId: string
  message: string
  messageType: 'user' | 'ai' | 'system'
  imageUrl?: string
  conversationHistory?: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

// Check if image is base64 data URL
function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:image/') && url.includes('base64,')
}

// Enhanced image validation function for both URLs and base64
async function validateImageUrl(imageUrl: string): Promise<boolean> {
  try {
    console.log('Validating image:', imageUrl.substring(0, 50) + '...')
    
    // If it's a base64 data URL, validate format
    if (isBase64DataUrl(imageUrl)) {
      console.log('✅ Base64 data URL detected - valid format')
      return true
    }
    
    // For regular URLs, test accessibility
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      console.error('Invalid URL protocol')
      return false
    }
    
    // Test image accessibility with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const response = await fetch(imageUrl, { 
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    console.log('Image validation response:', {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    })
    
    if (!response.ok) {
      console.error('Image not accessible:', response.status)
      return false
    }
    
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      console.error('Invalid content type:', contentType)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Image validation error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚗 AI Mechanic function called')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error('Invalid authentication')
    }

    console.log('✅ User authenticated:', user.id)

    // Parse request body
    const { sessionId, message, messageType, imageUrl, conversationHistory }: DiagnosticRequest = await req.json()

    console.log('📋 Request data:', { 
      sessionId, 
      messageType, 
      messageLength: message?.length,
      hasImage: !!imageUrl,
      imageType: imageUrl ? (isBase64DataUrl(imageUrl) ? 'base64' : 'url') : 'none'
    })

    if (!sessionId || !message) {
      throw new Error('Missing required fields: sessionId and message')
    }

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabaseClient
      .from('diagnostic_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (sessionError || !session) {
      console.error('Session error:', sessionError)
      throw new Error('Session not found or access denied')
    }

    console.log('✅ Session verified:', session.id)

    // Clean the message content for AI processing
    const cleanMessage = message.replace(/^🎤\s/, '').replace(/^📷\s/, '');

    // Mobile-optimized AI Mechanic personality system prompt
    const aiMechanicSystemPrompt = `You are "AI Mechanic" - a friendly, experienced automotive technician. You're voice-first and mobile-optimized, meaning you give CONCISE, helpful responses perfect for mobile screens.

🔧 MOBILE-FIRST COMMUNICATION RULES:
• Keep responses under 100 words when possible
• Use short paragraphs (1-2 sentences max)
• Lead with the most important info first
• Use bullet points for multiple items
• Avoid long explanations unless critical for safety

🚗 YOUR PERSONALITY:
• Friendly but direct: "Sounds like your brake pads"
• Plain English: "worn out" not "excessive friction material degradation"
• Encouraging: "Easy fix!" or "We can handle this"
• Safety-first: Always mention if it's dangerous to drive

🔍 DIAGNOSTIC APPROACH:
1. QUICK ASSESSMENT: Give your best guess first
2. URGENCY LEVEL: Always include priority (CRITICAL/HIGH/MEDIUM/LOW)
3. NEXT STEPS: One clear action item
4. FOLLOW-UP: Ask ONE specific question if needed

📱 RESPONSE FORMAT:
**Quick Take:** [Your assessment in 1-2 sentences]
**Urgency:** [CRITICAL/HIGH/MEDIUM/LOW] - [Why]
**Next Step:** [One clear action]
**Question:** [One follow-up question if needed]

🖼️ IMAGE ANALYSIS (when provided):
• Point out 2-3 key observations max
• Focus on what matters most
• Skip obvious details
• Give clear verdict

🛠️ REPAIR GUIDANCE:
• "DIY: [simple task]" or "Shop: [complex task]"
• Mention cost range if relevant: "$50-100" or "expensive repair"
• Suggest AR guide for DIY repairs when appropriate

CURRENT SITUATION:
• Issue: ${session.issue_description}
• Severity: ${session.severity}
• Status: ${session.status}

Remember: Mobile users want quick, actionable answers. Be the mechanic who gets straight to the point while staying helpful and friendly.`

    // Check OpenAI API configuration
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    let openaiPayload: any = {
      temperature: 0.2, // Lower for more consistent, focused responses
      max_tokens: 300, // Reduced for mobile-friendly responses
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    }

    // Handle image analysis with mobile-optimized mechanic expertise
    if (imageUrl) {
      console.log('🖼️ AI Mechanic analyzing automotive image (mobile-optimized)')
      
      // Validate image (works for both URLs and base64)
      const isImageValid = await validateImageUrl(imageUrl)
      
      if (!isImageValid) {
        console.warn('⚠️ Image validation failed, using guided diagnostic approach')
        
        // Fallback to guided analysis with mobile-optimized mechanic personality
        openaiPayload.model = 'gpt-4o-mini'
        openaiPayload.messages = [
          { role: 'system', content: aiMechanicSystemPrompt },
          ...conversationHistory?.slice(-4) || [], // Reduced context for mobile
          { 
            role: 'user', 
            content: `${cleanMessage}

I've got a photo but can't see it right now. Let's troubleshoot step by step.

**Quick questions:**
• What part of your car is in the photo?
• What caught your attention?
• Any leaks, damage, or weird colors?

Tell me what you see and I'll diagnose it!`
          }
        ]
      } else {
        console.log('✅ Image validated, AI Mechanic performing mobile-optimized visual inspection')
        
        // Use GPT-4o for direct image analysis with mobile-optimized mechanic personality
        openaiPayload.model = 'gpt-4o'
        openaiPayload.messages = [
          {
            role: 'system',
            content: aiMechanicSystemPrompt + `

🔍 MOBILE IMAGE ANALYSIS MODE:
You're looking at a customer's car photo on mobile. Give a CONCISE visual inspection:

MOBILE INSPECTION FORMAT:
**What I See:** [2-3 key observations]
**The Issue:** [Your diagnosis in 1 sentence]
**Urgency:** [CRITICAL/HIGH/MEDIUM/LOW] - [Brief reason]
**Action:** [What to do next]

FOCUS ON:
• Most obvious problems first
• Safety issues (mention immediately if critical)
• Skip minor details
• Give clear verdict

Keep it short - mobile users need quick answers!`
          },
          ...conversationHistory?.slice(-2) || [], // Minimal context for mobile
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${cleanMessage}

Quick photo analysis needed! What do you see and how urgent is it?

Issue context: "${session.issue_description}"`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl, // This now works with both URLs and base64 data URLs
                  detail: 'high'
                }
              }
            ]
          }
        ]
      }
    } else {
      // Standard conversation with mobile-optimized mechanic personality
      console.log('💬 AI Mechanic having mobile-optimized diagnostic conversation')
      openaiPayload.model = 'gpt-4o-mini'
      openaiPayload.messages = [
        { role: 'system', content: aiMechanicSystemPrompt },
        ...conversationHistory?.slice(-6) || [], // Reduced context for mobile
        { role: 'user', content: cleanMessage }
      ]
    }

    console.log('🤖 Calling OpenAI with mobile-optimized AI Mechanic:', {
      model: openaiPayload.model,
      messageCount: openaiPayload.messages.length,
      hasImageContent: imageUrl ? 'yes' : 'no',
      imageType: imageUrl ? (isBase64DataUrl(imageUrl) ? 'base64' : 'url') : 'none',
      maxTokens: openaiPayload.max_tokens
    })

    // Enhanced OpenAI API call with robust error handling
    let openaiResponse;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount <= maxRetries) {
      try {
        console.log(`🔄 OpenAI API attempt ${retryCount + 1}/${maxRetries + 1}`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 45000) // Reduced timeout for mobile
        
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(openaiPayload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)
        
        console.log('📡 OpenAI response status:', openaiResponse.status)

        if (openaiResponse.ok) {
          console.log('✅ OpenAI API call successful')
          break;
        }

        const errorData = await openaiResponse.text()
        console.error(`❌ OpenAI API error (attempt ${retryCount + 1}):`, {
          status: openaiResponse.status,
          statusText: openaiResponse.statusText,
          error: errorData.substring(0, 500)
        })
        
        // Handle specific error cases with mobile-optimized mechanic fallback
        if (openaiResponse.status === 400 && imageUrl && retryCount === 0) {
          console.log('🔄 Vision API failed, switching to mobile-optimized guided mode')
          
          // Switch to guided analysis with mobile-friendly mechanic approach
          openaiPayload = {
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: aiMechanicSystemPrompt },
              ...conversationHistory?.slice(-4) || [],
              { 
                role: 'user', 
                content: `${cleanMessage}

**Photo Issue:** Can't view your image right now, but let's solve this!

**Quick questions:**
• What part of your car is shown?
• What made you take the photo?
• Any visible leaks or damage?

Describe what you see and I'll diagnose it fast!`
              }
            ],
            temperature: 0.3,
            max_tokens: 250, // Even shorter for fallback
          }
          retryCount++;
          continue;
        }
        
        retryCount++;
        if (retryCount > maxRetries) {
          throw new Error(`OpenAI API error after ${maxRetries + 1} attempts: ${openaiResponse.status} - ${errorData}`)
        }
        
        // Exponential backoff
        const delay = 1000 * Math.pow(2, retryCount - 1)
        console.log(`⏳ Waiting ${delay}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        
      } catch (fetchError) {
        console.error(`🌐 Network error (attempt ${retryCount + 1}):`, fetchError)
        retryCount++;
        if (retryCount > maxRetries) {
          throw new Error(`Network error after ${maxRetries + 1} attempts: ${fetchError}`)
        }
        const delay = 1000 * Math.pow(2, retryCount - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    if (!openaiResponse || !openaiResponse.ok) {
      throw new Error('Failed to get valid response from OpenAI API after all retry attempts')
    }

    const aiData = await openaiResponse.json()
    console.log('📊 AI Mechanic response received:', {
      choices: aiData.choices?.length || 0,
      hasContent: !!aiData.choices?.[0]?.message?.content,
      usage: aiData.usage,
      model: aiData.model
    })

    const aiMessage = aiData.choices[0]?.message?.content

    if (!aiMessage) {
      console.error('❌ No content in AI Mechanic response:', aiData)
      throw new Error('No response content from AI Mechanic')
    }

    console.log('✅ AI Mechanic response received successfully, length:', aiMessage.length)

    // Mobile-optimized response enhancement
    let enhancedMessage = aiMessage;
    
    // Add AR guide suggestion for appropriate repairs (but keep it brief)
    const shouldSuggestAR = aiMessage.toLowerCase().includes('diy') || 
                           aiMessage.toLowerCase().includes('replace') || 
                           aiMessage.toLowerCase().includes('easy fix');
    
    if (shouldSuggestAR && !aiMessage.toLowerCase().includes('shop')) {
      enhancedMessage += `\n\n💡 **AR Guide Available** - Want step-by-step visual help?`;
    }

    // Ensure response isn't too long for mobile
    if (enhancedMessage.length > 400) {
      console.log('⚠️ Response too long for mobile, truncating...')
      const sentences = enhancedMessage.split('. ');
      let truncated = '';
      for (const sentence of sentences) {
        if ((truncated + sentence).length > 350) break;
        truncated += sentence + '. ';
      }
      enhancedMessage = truncated.trim();
      if (!enhancedMessage.endsWith('.')) {
        enhancedMessage += '.';
      }
    }

    // Save AI response to database
    const { data: aiMessageData, error: aiMessageError } = await supabaseClient
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        type: 'ai',
        content: enhancedMessage
      })
      .select()
      .single()

    if (aiMessageError) {
      console.error('❌ Error saving AI Mechanic message:', aiMessageError)
      throw new Error('Failed to save AI Mechanic response to database')
    }

    console.log('✅ AI Mechanic message saved to database:', aiMessageData.id)

    // Update session status if needed
    if (session.status === 'pending') {
      const { error: updateError } = await supabaseClient
        .from('diagnostic_sessions')
        .update({ 
          status: 'in-progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('⚠️ Error updating session status:', updateError)
      } else {
        console.log('✅ Session status updated to in-progress')
      }
    }

    // Return comprehensive response
    return new Response(
      JSON.stringify({
        success: true,
        message: aiMessageData,
        aiResponse: enhancedMessage,
        imageAnalyzed: imageUrl && openaiPayload.model === 'gpt-4o',
        model: openaiPayload.model,
        timestamp: new Date().toISOString(),
        mechanicInfo: {
          personality: 'AI Mechanic - Mobile-Optimized Expert',
          responseLength: enhancedMessage.length,
          mobileOptimized: true,
          imageProvided: !!imageUrl,
          imageType: imageUrl ? (isBase64DataUrl(imageUrl) ? 'base64' : 'url') : 'none',
          imageValidated: imageUrl ? await validateImageUrl(imageUrl) : false,
          modelUsed: openaiPayload.model,
          retryCount: retryCount,
          sessionIssue: session.issue_description,
          sessionSeverity: session.severity,
          arGuideAvailable: shouldSuggestAR
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in AI Mechanic function:', error)
    
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: errorDetails.substring(0, 500),
        mechanicAdvice: {
          message: "Quick hiccup on my end! Give me a sec and try again.",
          mobileOptimized: true,
          commonCauses: [
            'Service interruption',
            'Network issue',
            'High demand'
          ],
          suggestedActions: [
            'Try again in a moment',
            'Check connection',
            'Describe issue instead of photo'
          ]
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})