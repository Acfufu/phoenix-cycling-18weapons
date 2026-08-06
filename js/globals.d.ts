/* 全局声明：window.War 命名空间与各模块的松散类型
   经典 <script> 架构，模块彼此以全局对象耦合，
   通过 JSDoc + checkJs 在关键接缝上提供类型校验。 */

declare const War: any;

interface Window {
  War: any;
  webkitAudioContext?: typeof AudioContext;
}
