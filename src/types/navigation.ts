export type FrameShape =
  | 'round'
  | 'wayfarer'
  | 'browline'
  | 'aviator'
  | 'rectangle'
  | 'shield'
  | 'square'
  | 'cat-eye';

export type GlassItem = {
  empty?: any;
  id: string;
  name: string;
  brand: string;
  price: number;
  stock: number;
  status: string;
  image: string;
  frameShape: FrameShape;
  description?: string;
  
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  GlassDetail: { id: string };
  ProductImageView: {
    images: string[];
    initialIndex?: number;
    productName?: string;
  };
  NotificationSetting: undefined;
  Support: undefined;
  NotificationList: undefined;
  Privacy: undefined;
  EditProfile: undefined
};

export type BottomTabParamList = {
  Home: undefined;
  Glass: undefined;
  Scan: undefined;
  Store: undefined;
  Profile: undefined;
};
