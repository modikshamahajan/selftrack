const fs = require('fs');
const path = require('path');

const notifDir = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build');

// 1. Patch warnOfExpoGoPushUsage.js
const warnFile = path.join(notifDir, 'warnOfExpoGoPushUsage.js');
if (fs.existsSync(warnFile)) {
  let content = fs.readFileSync(warnFile, 'utf8');
  if (content.includes("throw new Error(message);")) {
    content = content.replace("throw new Error(message);", "didWarn = true; if (__DEV__) { console.warn(message); }");
    fs.writeFileSync(warnFile, content, 'utf8');
    console.log('[SelfTrack] Patched warnOfExpoGoPushUsage.js');
  }
}

// 2. Patch TopicSubscriptionModule.android.js
const topicFile = path.join(notifDir, 'TopicSubscriptionModule.android.js');
if (fs.existsSync(topicFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
} catch {}
export default mod || {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};
`;
  fs.writeFileSync(topicFile, content, 'utf8');
  console.log('[SelfTrack] Patched TopicSubscriptionModule.android.js');
}

// 3. Patch PushTokenManager.native.js
const pushTokenFile = path.join(notifDir, 'PushTokenManager.native.js');
if (fs.existsSync(pushTokenFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireOptionalNativeModule('ExpoPushTokenManager');
} catch {}
export default mod || {
  addListener: () => ({ remove: () => {} }),
  removeListener: () => {},
  removeAllListeners: () => {},
  emit: () => {},
  listenerCount: () => 0,
};
`;
  fs.writeFileSync(pushTokenFile, content, 'utf8');
  console.log('[SelfTrack] Patched PushTokenManager.native.js');
}

// 4. Patch ServerRegistrationModule.native.js
const serverRegFile = path.join(notifDir, 'ServerRegistrationModule.native.js');
if (fs.existsSync(serverRegFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireOptionalNativeModule('NotificationsServerRegistrationModule');
} catch {}
export default mod || {
  addListener: () => {},
  removeListeners: () => {},
  getRegistrationInfoAsync: () => Promise.resolve(null),
  setRegistrationInfoAsync: () => Promise.resolve(),
};
`;
  fs.writeFileSync(serverRegFile, content, 'utf8');
  console.log('[SelfTrack] Patched ServerRegistrationModule.native.js');
}

// 5. Patch BackgroundNotificationTasksModule.native.js
const bgTasksFile = path.join(notifDir, 'BackgroundNotificationTasksModule.native.js');
if (fs.existsSync(bgTasksFile)) {
  const content = `import { requireOptionalNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireOptionalNativeModule('ExpoBackgroundNotificationTasksModule');
} catch {}
export default mod || {
  async registerTaskAsync(taskName) { return null; },
  async unregisterTaskAsync(taskName) { return null; },
};
`;
  fs.writeFileSync(bgTasksFile, content, 'utf8');
  console.log('[SelfTrack] Patched BackgroundNotificationTasksModule.native.js');
}
