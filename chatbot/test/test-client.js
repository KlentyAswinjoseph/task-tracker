import axios from 'axios';

class MCPTestClient {
  constructor(baseURL = 'http://localhost:3002') {
    this.baseURL = baseURL;
  }

  async testTaskDetails(taskId) {
    try {
      console.log(`\n🔍 Testing Task Details for: ${taskId}`);
      console.log('='.repeat(50));
      
      const response = await axios.get(`${this.baseURL}/api/task/${taskId}`);
      
      if (response.data) {
        console.log('✅ Task Details Retrieved Successfully');
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log('❌ No task details found');
      }
    } catch (error) {
      console.error('❌ Error fetching task details:', error.response?.data || error.message);
    }
  }

  async testTaskAnalytics(taskId) {
    try {
      console.log(`\n📊 Testing Task Analytics for: ${taskId}`);
      console.log('='.repeat(50));
      
      const response = await axios.get(`${this.baseURL}/api/task/${taskId}/analytics`);
      
      if (response.data) {
        console.log('✅ Task Analytics Retrieved Successfully');
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log('❌ No analytics data found');
      }
    } catch (error) {
      console.error('❌ Error fetching task analytics:', error.response?.data || error.message);
    }
  }

  async testHealthCheck() {
    try {
      console.log('\n🏥 Testing Health Check');
      console.log('='.repeat(50));
      
      const response = await axios.get(`${this.baseURL}/api/chat/health`);
      
      console.log('✅ Health Check Response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error in health check:', error.response?.data || error.message);
    }
  }

  async testChatAPI(message, sessionId = 'test-session') {
    try {
      console.log(`\n💬 Testing Chat API`);
      console.log('='.repeat(50));
      console.log(`Message: ${message}`);
      
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message,
        sessionId
      });
      
      console.log('✅ Chat Response:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('❌ Error in chat API:', error.response?.data || error.message);
    }
  }
}

// Example usage
async function runTests() {
  const client = new MCPTestClient();
  
  console.log('🚀 Starting MCP Chatbot Tests');
  console.log('='.repeat(60));
  
  // Test health check
  await client.testHealthCheck();
  
  // Test task details for different formats
  const testTaskIds = ['GS-10262', 'GS10262', 'SQ2-1196', 'TASK-123'];
  
  for (const taskId of testTaskIds) {
    await client.testTaskDetails(taskId);
    await client.testTaskAnalytics(taskId);
  }
  
  // Test chat API with different queries
  const testMessages = [
    "Bring me the details for task ID GS-10262",
    "What are the analytics for task SQ2-1196?",
    "Show me the timeline for task TASK-123",
    "Get metrics for task GS10262"
  ];
  
  for (const message of testMessages) {
    await client.testChatAPI(message);
  }
  
  console.log('\n✅ All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export default MCPTestClient; 