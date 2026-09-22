import { Clock, TrendingUp, Users } from "lucide-react";

export interface CommunityMember {
  _id: string;
  name: string;
  bio: string;
  native_language: string;
  language_to_learn: string;
  imageUrls: string[];
}

export interface MemberCardProps {
  member: CommunityMember;
  onMemberClick: (memberId: string) => void;
}

export interface LanguageFlagProps {
  code: string;
}


export type TabType = "all" | "popular" | "new";


export const COMMON_LANGUAGES = [
  "English", "Spanish", "French", "German", "Korean", 
  "Japanese", "Chinese", "Portuguese", "Russian", "Italian"
] as const;

// Both tables now live in src/utils/languages.ts, generated from the backend
// catalog. LANGUAGE_FLAGS is re-exported because its contract is unchanged
// (still code-keyed). The old LANGUAGE_CODES is deliberately NOT re-exported:
// it was keyed by capitalized name ("English") and the generated NAME_TO_ISO
// is keyed lowercase, so an alias would keep the name while changing the
// contract. New code should import displayCode/languageFlag directly.
export { CODE_TO_FLAG as LANGUAGE_FLAGS } from "../../utils/languages.data";

export const TABS = [
  { id: "all" as const, label: "All", icon: Users },
  { id: "popular" as const, label: "Popular", icon: TrendingUp },
  { id: "new" as const, label: "New", icon: Clock }
] as const;

export interface MemberCardProps {
  member: CommunityMember;
  onMemberClick: (memberId: string) => void;
}


export interface UserData {
  _id: string;
  name: string;
  gender: string;
  email: string;
  bio: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  images: string[];
  native_language: string;
  language_to_learn: string;
  createdAt: string;
  followers: string[];
  following: string[];
  imageUrls: string[];
  isOnline?: boolean;
  lastActive?: string;
  lastSeen?: string;
  __v: number;
}

export interface SingleMember {
  data: UserData;
}

export interface RootState {
  auth: {
    userInfo?: {
      user: {
        _id: string;
      };
    };
  };
}

export interface LanguagePairProps {
  nativeLanguage: string;
  learningLanguage: string;
}

export interface ImageGalleryProps {
  images: string[];
  userName: string;
}

export interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "following"
    | "outline";
  isLoading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export interface StatsCardProps {
  value: number;
  label: string;
}
