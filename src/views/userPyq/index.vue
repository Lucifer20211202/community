<template>
  <div id="container" class="g-width g-block-center g-clear-both">
    <header id="banner">
      <div v-if="login" id="banner-background"
           :style="'--banner_background_image: url('+ userInfo.userCover +');--banner_background_image_position: 0;'"
           class="existbg"></div>
      <div v-else id="banner-background" class="existbg"
           style="--banner_background_image: url(https://alist.reaicc.com/image/png/2024-12-15/675ea481480efafa1504a40a.png);--banner_background_image_position: 0;"></div>
      <div id="banner-info" class="g-clear-both">
        <div class="name g-left g-txt-ellipsis g-user-select zh">
          <strong data-link="/" @click.stop="targetSelf($event.target)">{{
              login ? userInfo.username : '我是访客'
            }}</strong>
        </div>
        <div class="avatar g-right">
          <img alt="alt" class="g-alias-imgblock" draggable="false" loading="lazy"
               :src="login ? userInfo.avatar : 'https://alist.reaicc.com/image/png/2024-12-15/675ea470480efafa1504a409.png'"/>
        </div>
      </div>
      <div id="banner-subinfo" class="g-txt-ellipsis g-user-select">遇见即是上上签.</div>
    </header>
    <PostsComponents :externalFriendPostList="externalFriendPostList"/>
<!--    <FooterComponents @send="receiveFromChild"/>-->
  </div>
  <AudioComponents/>
  <!--  <div id="other" data-containermaxwidth="550">-->
  <!--    <div class="row g-clear-both">-->
  <!--      <div class="other-ico loading g-left"></div>-->
  <!--      <div class="other-text g-left"></div>-->
  <!--    </div>-->
  <!--  </div>-->
  <ViewsComponents/>
</template>

<script lang="ts" setup>
import {onMounted, ref} from "vue";
import ViewsComponents from "@/views/userPyq/component/viewsComponents.vue";
import AudioComponents from "@/views/userPyq/component/audioComponents.vue";
import PostsComponents from "@/views/userPyq/component/postsComponents.vue";
import { useUserStore } from '@/store/modules/user'
import { isLogin } from "@/utils/auth";
const login = isLogin();
const userStore = useUserStore()

const externalFriendPostList = ref([])
const receiveFromChild = (value) => {
  externalFriendPostList.value = value
}
const userInfo =  userStore.userInfo;
console.log('userInfo', userInfo)
// 辅助函数来加载脚本并等待其加载完成
async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = e => reject(e);
    document.body.appendChild(script);
  });
}
// 初始化一些响应式变量
const miscShowBool = ref(false);
// 处理滚动事件
function handleScroll() {
  const windowHeight = document.documentElement.clientHeight;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  miscShowBool.value = scrollTop > windowHeight / 2;
}
// 回到顶部按钮事件
function toTopButton() {
  if (!window.requestAnimationFrame) window.requestAnimationFrame = function (fun) {
    return setTimeout(fun, 1000 / 60);
  };
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
  let timer;
  let easingStart = 0;
  let easingBegin = 0;
  const easingEnd = document.documentElement.scrollTop || document.body.scrollTop;
  const easingDuring = 50;
  const easingCalc = (s: number, b: number, e: number, d: number) => {
    if (s == 0) return b;
    if (s == d) return b + e;
    if ((s /= d / 2) < 1) return e / 2 * Math.pow(2, 10 * (s - 1)) + b;
    return e / 2 * (-Math.pow(2, -10 * --s) + 2) + b;
  };
  const smoothUp = () => {
    const stepMove = easingEnd - easingCalc(easingStart, easingBegin, easingEnd, easingDuring);
    easingStart++;
    if (stepMove > 0) {
      document.body.scrollTop = stepMove;
      document.documentElement.scrollTop = stepMove;
      timer = window.requestAnimationFrame(smoothUp);
    } else {
      window.cancelAnimationFrame(timer);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }
  };
  timer = window.requestAnimationFrame(smoothUp);
}

// 组件挂载时添加滚动事件监听器
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

// 打开新窗口
function targetBlank(target: string) {
  window.open(target, '_blank');
}


onMounted(async () => {
  // try {
  // 加载 vue.min.js（通常Vue项目中不需要这一步，因为Vue已经作为依赖项被包含）
  // await loadScript('/src/assets/pink/js/vue.min.js');
  // await loadScript('/src/assets/pink/js/global.js');
  // await loadScript('/src/assets/pink/js/pyq.js');

  // 在这里执行依赖于两个脚本都已加载的操作
  // 例如，触发某个按钮的点击事件
  //   const autoloadElement = document.getElementById('autoload');
  //   if (autoloadElement) {
  //     autoloadElement.click();
  //     // 如果需要移除元素
  //     // autoloadElement.remove();
  //   }
  // } catch (error) {
  //   console.error('加载脚本时出错:', error);
  // }
});

</script>

<style scoped>
div:first-child:not(.recent-posts) {
  -webkit-box-shadow: var(--reaicc-shadow-border);
  box-shadow: var(--reaicc-shadow-border);
  border-radius: 12px;
  /*background: var(--reaicc-card-bg);*/
  /*border: var(--style-border);*/
  /*width: calc(100% - 300px);*/
  -webkit-align-self: flex-start;
  align-self: flex-start;
  -ms-flex-item-align: start;
  -webkit-animation: slide-in 0.6s 0.1s backwards;
  -moz-animation: slide-in 0.6s 0.1s backwards;
  -o-animation: slide-in 0.6s 0.1s backwards;
  -ms-animation: slide-in 0.6s 0.1s backwards;
  animation: slide-in 0.6s 0.1s backwards;
}

img {
  border-style: none;
  border-radius: 8px;
  max-width: 100%;
  transition: all 0.2s ease 0s;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -ms-user-drag: none;
  user-drag: none;
}

img {
  border: 0 none;
}


@keyframes slide-in {
  0% {
    -webkit-transform: translateY(20px);
    -moz-transform: translateY(20px);
    -o-transform: translateY(20px);
    -ms-transform: translateY(20px);
    transform: translateY(20px);
    opacity: 0;
    -ms-filter: "progid:DXImageTransform.Microsoft.Alpha(Opacity=0)";
    filter: alpha(opacity=0);
    transform: translateY(20px);
    opacity: 0;
  }
  100% {
    -webkit-transform: translateY(0);
    -moz-transform: translateY(0);
    -o-transform: translateY(0);
    -ms-transform: translateY(0);
    transform: translateY(0);
    opacity: 1;
    -ms-filter: none;
    filter: none;
    transform: translateY(0px);
    opacity: 1;
    filter: none;
  }

}

@keyframes autowait-anim {
  0% {
    opacity: 0.4;
    opacity: 0.4;
  }
  100% {
    opacity: 1;
    opacity: 1;
  }

}

@keyframes g-animation-wait-circle {
  0% {
    transform: rotate(0deg);
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
    transform: rotate(360deg);
  }

}

@keyframes g-animation-transparent-to-opaque {
  0% {
    opacity: 0;
    opacity: 0;
  }
  100% {
    opacity: 1;
    opacity: 1;
  }

}

@keyframes funbox-anim {
  0% {
    opacity: 0;
    transform: translateX(5px);
    opacity: 0;
    transform: translateX(5px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
    opacity: 1;
    transform: translateX(0px);
  }

}

</style>