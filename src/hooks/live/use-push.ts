import {getRandomString, windowReload} from 'billd-utils';
import {onMounted, onUnmounted, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import md5 from 'crypto-js';
import {fetchCreateUserLiveRoom, fetchUserHasLiveRoom,} from '@/api/live/userLiveRoom';
import {DanmuMsgTypeEnum, WsMessageMsgIsFileEnum} from '@/api//live/interface';
import {useAppStore} from '@/store/app';
import {useNetworkStore} from '@/store/network';
import {useUserStore} from '@/store/modules/user';
import {
  ILiveRoom,
  LiveRoomIsShowEnum,
  LiveRoomPullIsShouldAuthEnum,
  LiveRoomStatusEnum,
  LiveRoomTypeEnum,
  LiveRoomUseCDNEnum
} from '@/api/live/types/ILiveRoom';
import {
  WsConnectStatusEnum,
  WsMessageType,
  WsMsgTypeEnum,
  WsMsrBlobType,
  WsRoomNoLiveType,
} from '@/api/live/types/websocket';
import {createVideo, generateBase64} from '@/utils';
import {handlConstraints} from '@/utils/network/webRTC';

import {commentAuthTip, loginTip} from './use-login';
import {useTip} from './use-tip';
import {useWebsocket} from './use-websocket';
import {message} from "ant-design-vue";
import userLiveRoom from '@/api/live/interface';

const userId = localStorage.getItem("userId");

export function usePush() {
  const route = useRoute();
  const router = useRouter();
  const appStore = useAppStore();
  const userStore = useUserStore();
  const networkStore = useNetworkStore();

  const roomId = ref('');
  const roomName = ref('');
  const danmuStr = ref('');
  const liveRoomInfo = ref<ILiveRoom>();
  const localStream = ref<MediaStream>();
  const videoElArr = ref<HTMLVideoElement[]>([]);
  const msgIsFile = ref<WsMessageMsgIsFileEnum>(WsMessageMsgIsFileEnum.no);

  const {
    roomLiving,
    initWs,
    handleStartLive,
    connectStatus,
    mySocketId,
    canvasVideoStream,
    lastCoverImg,
    liveUserList,
    damuList,
    currentMaxFramerate,
    currentMaxBitrate,
    currentResolutionRatio,
    currentAudioContentHint,
    currentVideoContentHint,
  } = useWebsocket();

  onMounted(() => {
    if (!loginTip()) return;
  });

  onUnmounted(() => {
    closeWs();
    closeRtc();
  });

  function closeWs() {
    networkStore.wsMap.forEach((ws) => {
      networkStore.removeWs(ws.roomId);
    });
  }

  function closeRtc() {
    networkStore.rtcMap.forEach((rtc) => {
      networkStore.removeRtc(rtc.receiver);
    });
  }

  watch(
      () => currentResolutionRatio.value,
      (newval) => {
        console.log('分辨率变了', newval);
        networkStore.rtcMap.forEach((rtc) => {
          if (canvasVideoStream.value) {
            handlConstraints({
              frameRate: rtc.maxFramerate,
              height: newval,
              stream: canvasVideoStream.value,
            });
          }
        });
      }
  );

  watch(
      () => currentMaxFramerate.value,
      (newval) => {
        console.log('帧率变了', newval);
        networkStore.rtcMap.forEach((rtc) => {
          if (canvasVideoStream.value) {
            handlConstraints({
              frameRate: newval,
              height: rtc.resolutionRatio,
              stream: canvasVideoStream.value,
            });
          }
        });
      }
  );

  watch(
      () => currentMaxBitrate.value,
      (newval) => {
        console.log('码率变了', newval);
        networkStore.rtcMap.forEach(async (rtc) => {
          const res = await rtc.setMaxBitrate(newval);
          if (res === 1) {
            message.success('切换码率成功！');
          } else {
            message.success('切换码率失败！');
          }
        });
      }
  );

  watch(
      () => localStream.value,
      (stream) => {
        console.log('localStream变了');
        console.log('音频轨：', stream?.getAudioTracks());
        console.log('视频轨：', stream?.getVideoTracks());
        videoElArr.value.forEach((dom) => {
          dom.remove();
        });
        stream?.getVideoTracks().forEach((track) => {
          console.log('视频轨enabled：', track.id, track.enabled);
          const video = createVideo({});
          video.setAttribute('track-id', track.id);
          video.srcObject = new MediaStream([track]);
          videoElArr.value.push(video);
        });
        stream?.getAudioTracks().forEach((track) => {
          console.log('音频轨enabled：', track.id, track.enabled);
          const video = createVideo({});
          video.setAttribute('track-id', track.id);
          video.srcObject = new MediaStream([track]);
          videoElArr.value.push(video);
        });
      },
      {deep: true}
  );

  watch(
      () => userStore.userInfo,
      async (newVal) => {
        if (newVal) {
          const res = await handleUserHasLiveRoom();
          if (!res) {
            await useTip({
              content: '你还没有直播间，是否立即开通？',
              maskClosable: false,
            });
            await handleCreateUserLiveRoom();
          } else {
            roomName.value = liveRoomInfo.value?.name || '';
            roomId.value = liveRoomInfo.value?.id || '';
            connectWs();
          }
        }
      },
      {immediate: true}
  );

  // 检查对象是否为空的辅助函数
  function isEmptyObject(obj: any): boolean {
    return obj && typeof obj === 'object' && Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  async function handleUserHasLiveRoom() {
    const res = await fetchUserHasLiveRoom(userId);
    if (res.status === 200 && !isEmptyObject(res.data.data) && res.data.data != null) {
      liveRoomInfo.value = res.data.data.live_room;
      router.push({
        query: {...route.query, roomId: liveRoomInfo.value?.id},
      });
      return true;
    }
    return false;
  }
  userStore.getInfo(); // 获取用户信息
  async function handleCreateUserLiveRoom() {
    try {
      userLiveRoom.key = md5.MD5(`${+new Date()}___${getRandomString(6)}`).toString();
      userLiveRoom.type = LiveRoomTypeEnum.obs;
      userLiveRoom.weight = 21;
      userLiveRoom.cdn = LiveRoomUseCDNEnum.no;
      userLiveRoom.pullIsShouldAuth = LiveRoomPullIsShouldAuthEnum.no;
      userLiveRoom.isShow = LiveRoomIsShowEnum.yes;
      userLiveRoom.status = LiveRoomStatusEnum.normal;
      userLiveRoom.name = userStore.userInfo.nickName || '未命名直播间';
      const res = await fetchCreateUserLiveRoom(userLiveRoom);
      if (res.status === 200) {
        message.success('开通直播间成功！');
        setTimeout(() => {
          windowReload();
        }, 500);
      }
    } catch (error) {
      console.log(error);
    }
  }

  function connectWs() {
    initWs({
      isRemoteDesk: false,
      isAnchor: true,
      roomId: roomId.value,
      currentMaxBitrate: currentMaxBitrate.value,
      currentMaxFramerate: currentMaxFramerate.value,
      currentResolutionRatio: currentResolutionRatio.value,
    });
  }

  async function startLive({type, msrDelay, msrMaxDelay}) {
    if (!loginTip()) return;
    const flag = await handleUserHasLiveRoom();
    if (!flag) {
      await useTip({
        content: '你还没有直播间，是否立即开通？',
        maskClosable: false,
      });
      await handleCreateUserLiveRoom();
      return;
    }
    if (!roomNameIsOk()) {
      return;
    }
    if (connectStatus.value !== WsConnectStatusEnum.connect) {
      message.warning('websocket未连接');
      return;
    }

    roomLiving.value = true;
    const el = appStore.allTrack.find((item) => {
      if (item.video === 1) {
        return true;
      }
    });
    if (el) {
      const res1 = videoElArr.value.find(
          (item) => item.getAttribute('track-id') === el.track?.id
      );
      if (res1) {
        // canvas推流的话，不需要再设置预览图了
        if (!canvasVideoStream.value) {
          lastCoverImg.value = generateBase64(res1);
        }
      }
    }
    if (canvasVideoStream.value) {
      handlConstraints({
        stream: canvasVideoStream.value,
        height: currentResolutionRatio.value,
        frameRate: currentMaxFramerate.value,
      });
    }
    handleStartLive({
      name: roomName.value,
      type,
      msrDelay,
      msrMaxDelay,
    });
  }

  /** 结束直播 */
  function endLive() {
    roomLiving.value = false;
    localStream.value = undefined;
    const instance = networkStore.wsMap.get(roomId.value);
    if (instance) {
      instance.send<WsRoomNoLiveType['data']>({
        requestId: getRandomString(8),
        msgType: WsMsgTypeEnum.roomNoLive,
        data: {
          live_room: appStore.liveRoomInfo!,
        },
      });
    }
    closeRtc();
  }

  function sendBlob(data: { blob; blobId: string; delay; max_delay }) {
    const instance = networkStore.wsMap.get(roomId.value);
    if (instance) {
      instance.send<WsMsrBlobType['data']>({
        requestId: getRandomString(8),
        msgType: WsMsgTypeEnum.msrBlob,
        data: {
          live_room_id: roomId.value,
          blob: data.blob,
          blob_id: data.blobId,
          delay: data.delay,
          max_delay: data.max_delay,
        },
      });
    }
  }

  function roomNameIsOk() {
    if (!roomName.value.length) {
      message.warning('请输入房间名！');
      return false;
    }
    if (roomName.value.length < 3 || roomName.value.length > 20) {
      message.warning('房间名要求3-20个字符！');
      return false;
    }
    return true;
  }

  function keydownDanmu(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (key === 'enter') {
      event.preventDefault();
      sendDanmu();
    }
  }

  function confirmRoomName() {
    if (!roomNameIsOk()) return;
  }

  function sendDanmu() {
    if (!loginTip()) {
      return;
    }
    if (!commentAuthTip()) {
      return;
    }
    if (!danmuStr.value.length) {
      message.warning('请输入弹幕内容！');
      return;
    }
    const instance = networkStore.wsMap.get(roomId.value);
    if (!instance) {
      message.error('还没开播，不能发送弹幕！');
      return;
    }
    instance.send<WsMessageType['data']>({
      requestId: getRandomString(8),
      msgType: WsMsgTypeEnum.message,
      data: {
        socket_id: '',
        msg: danmuStr.value,
        msgType: DanmuMsgTypeEnum.danmu,
        live_room_id: roomId.value,
        msgIsFile: msgIsFile.value,
        send_msg_time: +new Date(),
        user_agent: navigator.userAgent,
      },
    });
    danmuStr.value = '';
  }

  return {
    confirmRoomName,
    startLive,
    endLive,
    sendDanmu,
    keydownDanmu,
    sendBlob,
    roomId,
    msgIsFile,
    mySocketId,
    lastCoverImg,
    localStream,
    canvasVideoStream,
    roomLiving,
    currentResolutionRatio,
    currentMaxBitrate,
    currentMaxFramerate,
    currentAudioContentHint,
    currentVideoContentHint,
    danmuStr,
    roomName,
    damuList,
    liveUserList,
    liveRoomInfo,
  };
}
