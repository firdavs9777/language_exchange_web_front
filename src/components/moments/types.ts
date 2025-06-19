export interface MomentType {
  _id: string;
  title: string;
  description: string;
  comments: [];
  commentCount: number;
  images: string[];
  likeCount: number;
  likedUsers: string[];
  user: {
    _id: string;
    name: string;
    gender: string;
    email: string;
    bio: string;
    birth_year: string;
    birth_month: string;
    birth_day: string;
    image: string;
    native_language: string;
    language_to_learn: string;
    createdAt: string;
    imageUrls: string[];
    __v: number;
  };
  createdAt: string;
  __v: number;
  imageUrls: string[];
  refetch?: () => {};
}
