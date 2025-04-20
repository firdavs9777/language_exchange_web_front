import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";
import Message from "../Message";
import Loader from "../Loader";
import "./MainCommunity.css";

// 디바운스 훅 (입력 지연 처리)
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export interface CommunityMember {
  _id: string;
  name: string;
  bio: string;
  native_language: string;
  language_to_learn: string;
  imageUrls: string[];
}

export interface CommunityResponse {
  success: boolean;
  count: number;
  data: CommunityMember[];
}

const MainCommunity = () => {
  // 상태 관리
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10; // 한 번에 불러올 멤버 수
  const [allMembers, setAllMembers] = useState<CommunityMember[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 디바운스 적용된 필터 값
  const debouncedFilter = useDebounce(filter, 300);

  // RTK Query를 이용한 멤버 데이터 가져오기
  const {
    data: communityData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityMembersQuery({
    page,
    limit,
    filter: debouncedFilter, // 백엔드 필터링 지원 가정
  });

  // 현재 사용자 ID
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);

  // 데이터 업데이트 처리
  useEffect(() => {
    if (communityData) {
      if (page === 1) {
        // 첫 페이지면 전체 교체
        setAllMembers(communityData.data);
      } else {
        // 다음 페이지면 추가
        setAllMembers((prev) => {
          const existingIds = new Set(prev.map((member) => member._id));
          const newMembers = communityData.data.filter(
            (member) => !existingIds.has(member._id)
          );
          return [...prev, ...newMembers];
        });
      }

      // 더 불러올 데이터가 있는지 확인
      setHasMore(communityData.data.length >= limit);
      setIsLoadingMore(false);
    }
  }, [communityData, page, limit]);

  // 필터 입력 처리
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    setPage(1); // 필터 변경 시 페이지 초기화
  };

  // 무한 스크롤 처리
  const handleScroll = useCallback(() => {
    if (isLoading || isFetching || isLoadingMore || !hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.offsetHeight - 500;

    if (scrollPosition >= threshold) {
      setIsLoadingMore(true);
      setPage((prevPage) => prevPage + 1);
    }
  }, [isLoading, isFetching, isLoadingMore, hasMore]);

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // 클라이언트 측 필터링 (백엔드 필터링 미지원 시)
  const filteredMembers = useMemo(() => {
    return allMembers
      .filter((member) => member._id !== userId) // 현재 사용자 제외
      .filter(
        (member) =>
          debouncedFilter === "" ||
          member.name.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
          member.native_language
            .toLowerCase()
            .includes(debouncedFilter.toLowerCase()) ||
          member.language_to_learn
            .toLowerCase()
            .includes(debouncedFilter.toLowerCase())
      );
  }, [allMembers, userId, debouncedFilter]);

  // 로딩 상태
  if (isLoading && page === 1) {
    return (
      <div className="loader-container">
        <Loader />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="error-container">
        <Message variant="danger">
          멤버 목록을 불러오는 중 오류가 발생했습니다: {(error as any).message}
          <button onClick={refetch} className="retry-button">
            다시 시도
          </button>
        </Message>
      </div>
    );
  }

  return (
    <div className="community-container">
      <div className="community-header">
        <h2>언어 교환 커뮤니티</h2>
        <div className="search-container">
          <input
            type="text"
            placeholder="이름 또는 언어로 검색..."
            value={filter}
            onChange={handleFilterChange}
            className="search-input"
          />
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <p>조건에 맞는 커뮤니티 멤버가 없습니다</p>
          {debouncedFilter && (
            <button
              onClick={() => setFilter("")}
              className="clear-filter-button"
            >
              검색 필터 초기화
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="community-grid">
            {filteredMembers.map((member) => (
              <Link
                to={`/community/${member._id}`}
                key={member._id}
                className="member-link"
              >
                <div className="community-card">
                  <div className="community-image-container">
                    <img
                      src={
                        member.imageUrls?.length > 0
                          ? member.imageUrls[member.imageUrls.length - 1]
                          : "/images/default-avatar.jpg"
                      }
                      alt={member.name}
                      className="community-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "/images/default-avatar.jpg";
                      }}
                    />
                  </div>
                  <div className="community-profile">
                    <h3 className="card-title">{member.name}</h3>
                    <p className="card-text bio">
                      {member.bio?.substring(0, 80) || "소개가 없습니다"}
                      {member.bio?.length > 80 ? "..." : ""}
                    </p>
                    <div className="language-tags">
                      <span className="native-tag">
                        <span className="tag-label">모국어:</span>{" "}
                        {member.native_language}
                      </span>
                      <span className="learning-tag">
                        <span className="tag-label">배우는 중:</span>{" "}
                        {member.language_to_learn}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 추가 데이터 로딩 중 표시 */}
          {(isLoadingMore || isFetching) && (
            <div className="loader-container-bottom">
              <Loader />
              <p>더 많은 멤버를 불러오는 중...</p>
            </div>
          )}

          {/* 모든 데이터 로드 완료 표시 */}
          {!hasMore && filteredMembers.length > 0 && (
            <div className="end-message">
              <p>모든 멤버를 불러왔습니다</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainCommunity;
