export interface LoginEvent {
  timestamp: Date;
  metadata: {
    userId: string;
  };
}
