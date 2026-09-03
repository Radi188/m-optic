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
  /**
   * The product's own .glb (assets[type='3d_model']) for the selected
   * colourway. The viewers fall back to the bundled model when absent.
   */
  modelUrl?: string | null;
};

/** One colourway as the full-screen image viewer needs it. */
export type ImageViewColor = {
  id: string;
  hex: string;
  label: string;
  images: string[];
};

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  VerifyOtp: { phone_number: string };
  SetPin: { phone_number: string };
  Main: undefined;
  GlassDetail: { id: string };
  ProductImageView: {
    /** Gallery for the colourway open when the viewer was launched. */
    images: string[];
    initialIndex?: number;
    productName?: string;
    /** Every colourway, each with its own gallery, so the viewer can switch. */
    colors?: ImageViewColor[];
    selectedColorId?: string;
  };
  NotificationSetting: undefined;
  Support: undefined;
  NotificationList: undefined;
  Privacy: undefined;
  EditProfile: undefined;
  PointMember: undefined;
  Reward: undefined;
  PrescriptionDetail: undefined;
  GlassesList: {
  from?: 'brand' | 'frame';
  brandId?: number | 'all';
  brandName?: string;
  frameShape?: string;
  };
  SearchScreen: undefined;
  SearchResult: {
    query: string;
  };
  Scan: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Glass: undefined;
 
  Store: undefined;
  History: undefined;
  Profile: undefined;
};
