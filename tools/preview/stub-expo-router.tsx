// Web-preview stand-in for expo-router (the preview renders single screens outside a navigator).
import React, { useEffect } from 'react';
const params = () => (globalThis as any).__PARAMS__ || {};
export const useRouter = () => ({ push: (...a: any[]) => console.log('push', JSON.stringify(a)), replace: (...a: any[]) => console.log('replace', JSON.stringify(a)), back: () => console.log('back'), canGoBack: () => true });
export const useLocalSearchParams = () => params();
export const useFocusEffect = (cb: () => void | (() => void)) => { useEffect(cb, []); };
export const Stack: any = () => null; Stack.Screen = () => null;
export const Tabs: any = () => null; Tabs.Screen = () => null;
export const Link = ({ children }: any) => <>{children}</>;
export default {};
