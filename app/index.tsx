import { Redirect } from 'expo-router';
import { useStore } from '@/data/store';

export default function Index() {
  const { onboarded } = useStore();
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
