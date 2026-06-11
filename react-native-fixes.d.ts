import * as React from 'react';
import {
  ViewProps,
  TextProps,
  TextInputProps,
  ScrollViewProps,
  ActivityIndicatorProps,
  ImageProps,
  KeyboardAvoidingViewProps,
  RefreshControlProps,
  StyleProp,
  ViewStyle
} from 'react-native';

declare module 'react-native' {
  interface ViewProps {
    children?: React.ReactNode;
  }
  interface TextProps {
    children?: React.ReactNode;
  }
  interface ScrollViewProps {
    children?: React.ReactNode;
  }
  interface KeyboardAvoidingViewProps {
    children?: React.ReactNode;
  }

  interface FlatListProps<ItemT> {
    style?: StyleProp<ViewStyle>;
    scrollEnabled?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  }

  interface View extends React.Component<ViewProps> {}
  interface Text extends React.Component<TextProps> {}
  interface TextInput extends React.Component<TextInputProps> {}
  interface ScrollView extends React.Component<ScrollViewProps> {}
  interface ActivityIndicator extends React.Component<ActivityIndicatorProps> {}
  interface Image extends React.Component<ImageProps> {}
  interface KeyboardAvoidingView extends React.Component<KeyboardAvoidingViewProps> {}
  interface RefreshControl extends React.Component<RefreshControlProps> {}

  namespace Animated {
    interface AnimatedComponent<T extends React.ComponentType<any>> {
      (props: React.ComponentProps<T> & { children?: React.ReactNode; style?: StyleProp<any> }): React.ReactElement | null;
    }
  }
}

declare module 'invariant';
