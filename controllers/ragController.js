const DocumentChunk = require('../models/DocumentChunks');

const askQuestion = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Please enter a question.' });
    }

    const allChunks = await DocumentChunk.find();

    if (!allChunks || allChunks.length === 0) {
      return res.status(400).json({ error: 'No document chunks found. Please upload a PDF document first.' });
    }

    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const scoredChunks = allChunks.map(chunk => {
      const lowerText = chunk.chunkText.toLowerCase();
      let score = 0;

      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          score += 1;
        }
      });

      return { chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);

    const topChunks = scoredChunks.slice(0, 5);

    const contextText = topChunks
      .map(item => `[Document: ${item.chunk.documentName}, Page: ${item.chunk.pageNumber}]\n${item.chunk.chunkText}`)
      .join('\n\n');

    const systemPrompt = `You are an AI document assistant.

Answer the user's question using ONLY the provided document context.

If the answer is not available in the context, say:
I could not find this information in the uploaded documents.

Do not invent information.

DOCUMENT CONTEXT:
${contextText}

USER QUESTION:
${question}

Give a clear and concise answer.`;
0

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'openrouter/free',
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API Response Error:', errorText);
      return res.status(500).json({ error: 'OpenRouter API request failed. Please check your API key and model.' });
    }

    const aiData = await response.json();
    const answer = aiData.choices && aiData.choices[0] && aiData.choices[0].message
      ? aiData.choices[0].message.content
      : 'I could not generate an answer at this time.';

    const sources = [];
    const sourceSet = new Set();

    topChunks.forEach(item => {
      const identifier = `${item.chunk.documentName}-page-${item.chunk.pageNumber}`;
      if (!sourceSet.has(identifier)) {
        sourceSet.add(identifier);
        sources.push({
          document: item.chunk.documentName,
          page: item.chunk.pageNumber
        });
      }
    });

    return res.status(200).json({
      answer,
      sources
    });
  } catch (error) {
    console.error('RAG Controller Error:', error.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

module.exports = { askQuestion };

