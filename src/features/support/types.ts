export type InquiryType = 'GENERAL' | 'ERROR';

export interface InquiryRequest {
  type: InquiryType;
  title: string;
  content: string;
  replyEmail: string;
  appVersion?: string;
  buildNumber?: string;
  deviceModel?: string;
  osName?: string;
  osVersion?: string;
  errorCode?: string;
  screenName?: string;
}

export interface InquiryResponse {
  trackingNo: string;
}
