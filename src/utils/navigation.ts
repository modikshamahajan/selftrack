/**
 * Safely navigates back if a previous screen exists in the stack,
 * otherwise falls back to a safe screen (default: Home tab).
 * Prevents "The action 'GO_BACK' was not handled by any navigator" error.
 */
export const safeGoBack = (
  navigation: any,
  fallbackScreen: string = 'MainTabs',
  fallbackParams: any = { screen: 'Home' }
) => {
  try {
    if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation && typeof navigation.navigate === 'function') {
      if (fallbackParams !== undefined) {
        navigation.navigate(fallbackScreen, fallbackParams);
      } else {
        navigation.navigate(fallbackScreen);
      }
    }
  } catch (e) {
    try {
      navigation?.navigate?.('MainTabs', { screen: 'Home' });
    } catch {}
  }
};
