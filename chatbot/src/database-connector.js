import mongoose from 'mongoose';

export class DatabaseConnector {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect() {
    try {
      if (this.isConnected) {
        return this.connection;
      }

      const uri =process.env.MONGO_URI;
      
      this.connection = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      this.isConnected = true;
      console.log('Database connected successfully');
      
      return this.connection;
    } catch (error) {
      console.error('Database connection error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        console.log('Database disconnected');
      }
    } catch (error) {
      console.error('Database disconnection error:', error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { status: 'disconnected', error: 'Not connected to database' };
      }

      // Simple ping to check if connection is alive
      await mongoose.connection.db.admin().ping();
      
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        readyState: mongoose.connection.readyState
      };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 