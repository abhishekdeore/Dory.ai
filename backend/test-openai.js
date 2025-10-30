// Quick test script to verify OpenAI API key
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('🔍 Testing OpenAI API key...');
    console.log('API Key format:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',  // Testing newer model
      input: 'Hello world',
    });

    console.log('✅ SUCCESS! OpenAI API is working!');
    console.log('Embedding dimensions:', response.data[0].embedding.length);
    console.log('✅ Your API key is valid and has quota.');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR: OpenAI API call failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.status === 401) {
      console.error('\n🔑 ISSUE: Invalid API key');
      console.error('Solution: Check your OpenAI API key at https://platform.openai.com/api-keys');
    } else if (error.status === 429) {
      console.error('\n⚠️  ISSUE: Rate limit or quota exceeded');
      console.error('Solution: Check your usage at https://platform.openai.com/usage');
    } else if (error.status === 404) {
      console.error('\n❓ ISSUE: Model not found or no access');
      console.error('Solution: Verify model access at https://platform.openai.com/');
    } else {
      console.error('\n❌ Unknown error:', error);
    }

    process.exit(1);
  }
}

testOpenAI();
