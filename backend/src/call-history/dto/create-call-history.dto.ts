export class CreateCallHistoryDto {
  peerUserId!: number;
  peerUsername!: string;
  callType!: string;
  callStatus!: string;
  duration!: number;
  roomKey!: string;
}
