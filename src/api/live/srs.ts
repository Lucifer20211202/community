import axios from "@/request/axios";

export function fetchRtcV1Publish(data: {
  api: string;
  clientip: string | null;
  sdp: string;
  streamurl: string;
  tid: string;
}) {
  return axios.post(`/srs/rtcV1Publish`, data);
}

export function fetchRtcV1Play(data: {
  api: string;
  clientip: string | null;
  sdp: string;
  streamurl: string;
  tid: string;
}) {
  return axios.post(`/srs/rtcV1Play`, data);
}

