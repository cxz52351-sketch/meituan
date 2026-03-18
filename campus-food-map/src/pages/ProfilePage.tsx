import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { University, UserProfile } from "../types";
import {
  getProfile,
  saveProfile,
  getFriends,
  removeFriend,
} from "../services/profile";
import { universities } from "../data/restaurants";
import {
  getRandomHistory,
  RandomHistoryItem,
  getGroupOrderHistory,
  GroupOrderHistoryItem,
  getFlipHistory,
  FlipHistoryItem,
  getVisitHistory,
  VisitHistoryItem,
} from "../services/history";
import { getUserInsights } from "../services/userInsights";

interface Props {
  university: University | "all";
}

const avatarOptions = [
  "😎",
  "😊",
  "🤓",
  "😋",
  "🥳",
  "🤗",
  "😺",
  "🐱",
  "🐶",
  "🐰",
  "🦊",
  "🐻",
  "🐼",
  "🐸",
  "🦁",
  "🐯",
  "🐷",
  "🐮",
  "🐵",
  "🦄",
  "👦",
  "👧",
  "🧑",
  "👩",
  "🧔",
  "👱‍♀️",
  "🧑‍💻",
  "📷",
  "🎮",
  "⚽",
  "🎵",
  "🌟",
];

const yearOptions = ["大一", "大二", "大三", "大四", "研一", "研二", "研三"];

// 干饭人设标签
const diningTagOptions = [
  {
    group: "辣度",
    tags: ["不吃辣星人", "微辣选手", "无辣不欢", "变态辣挑战者"],
  },
  {
    group: "预算",
    tags: ["穷鬼套餐专业户", "性价比之王", "偶尔奢侈", "顿顿不亏嘴"],
  },
  {
    group: "风格",
    tags: [
      "一人食达人",
      "社交型干饭",
      "外卖依赖症",
      "食堂钉子户",
      "奶茶续命",
      "深夜放毒",
    ],
  },
  {
    group: "偏好",
    tags: [
      "中餐永远的神",
      "日料寿司控",
      "火锅一周三次",
      "甜品不能停",
      "减脂餐选手",
      "来者不拒",
    ],
  },
];

const bioPlaceholders = [
  "没有什么事是一顿火锅解决不了的",
  "今天的快乐是奶茶给的",
  "学废了就去干饭，干完饭继续学废",
  "人生苦短，先吃为敬",
];

export default function ProfilePage({ university }: Props) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [friends, setFriends] = useState(getFriends());

  // 工具箱历史数据
  const [randomHistory, setRandomHistory] = useState<RandomHistoryItem[]>([]);
  const [groupHistory, setGroupHistory] = useState<GroupOrderHistoryItem[]>([]);
  const [flipHistory, setFlipHistory] = useState<FlipHistoryItem[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitHistoryItem[]>([]);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // 美团生态状态
  const [meituanBound, setMeituanBound] = useState(
    () => localStorage.getItem("campus_food_meituan_bound") === "true",
  );
  const [showBindSuccess, setShowBindSuccess] = useState(false);
  const [showCoupons, setShowCoupons] = useState(false);
  // 稳定的美团数据（避免每次渲染随机）
  const [meituanStats] = useState(() => ({
    saved: Math.floor(Math.random() * 80) + 40,
    orders: Math.floor(Math.random() * 20) + 8,
    coupons: Math.floor(Math.random() * 5) + 2,
    points: Math.floor(Math.random() * 300) + 100,
  }));

  // 表单状态
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState("😎");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("大三");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [selectedUni, setSelectedUni] = useState<University>(
    university === "all" ? "北京大学" : university,
  );
  const [diningTags, setDiningTags] = useState<Set<string>>(new Set());
  const [bio, setBio] = useState("");

  useEffect(() => {
    const saved = getProfile();
    if (saved) {
      setProfile(saved);
      setNickname(saved.nickname);
      setAvatar(saved.avatar);
      setMajor(saved.major);
      setYear(saved.year);
      setGender(saved.gender);
      setSelectedUni(saved.university);
      setDiningTags(new Set(saved.diningTags || []));
      setBio(saved.bio || "");
    } else {
      // 首次进入：如果有AI分析数据，用AI预填
      const aiProfile = generateProfileFromDNA();
      if (aiProfile) {
        setNickname(aiProfile.nickname);
        setDiningTags(aiProfile.tags);
        setBio(aiProfile.bio);
      }
      setIsSetup(true);
    }
  }, []);

  useEffect(() => {
    setFriends(getFriends());
  }, []);

  // 加载工具箱历史数据
  useEffect(() => {
    setRandomHistory(getRandomHistory());
    setGroupHistory(getGroupOrderHistory());
    setFlipHistory(getFlipHistory());
    setVisitHistory(getVisitHistory());
  }, []);

  // ===== AI 口味 DNA 分析 =====
  const userInsights = useMemo(
    () => getUserInsights(),
    [randomHistory, visitHistory, groupHistory, flipHistory, friends],
  );

  // ===== AI 预填资料（基于口味DNA） =====
  const generateProfileFromDNA = () => {
    if (!userInsights) return null;

    // 从AI总结生成昵称（提取关键词）
    const summaryKeywords =
      userInsights.overallSummary.match(/"([^"]+)"/)?.[1] || "";
    const suggestedNickname = summaryKeywords.split(" · ")[0] || "干饭人";

    // 自动勾选干饭人设标签
    const autoTags = new Set<string>();

    // 辣度标签
    if (userInsights.taste.spiceLevel === "heavy") autoTags.add("无辣不欢");
    else if (userInsights.taste.spiceLevel === "medium")
      autoTags.add("微辣选手");
    else if (userInsights.taste.spiceLevel === "light")
      autoTags.add("不吃辣星人");

    // 预算标签
    if (userInsights.consumption.priceSensitivity === "high")
      autoTags.add("穷鬼套餐专业户");
    else if (userInsights.consumption.priceSensitivity === "medium")
      autoTags.add("性价比之王");
    else autoTags.add("偶尔奢侈");

    // 社交标签
    if (userInsights.social.socialType === "extrovert")
      autoTags.add("社交型干饭");
    else if (userInsights.social.socialType === "introvert")
      autoTags.add("一人食达人");

    // 探店标签
    if (userInsights.explore.exploreType === "adventurous")
      autoTags.add("来者不拒");
    else if (userInsights.explore.exploreType === "conservative") {
      // 根据最爱品类添加标签
      const topCat = userInsights.taste.topCategories[0]?.category;
      if (topCat === "火锅") autoTags.add("火锅一周三次");
      else if (topCat === "中餐") autoTags.add("中餐永远的神");
      else if (topCat === "日料") autoTags.add("日料寿司控");
    }

    // 个性签名用AI总结
    const suggestedBio = userInsights.overallSummary;

    return {
      nickname: suggestedNickname,
      tags: autoTags,
      bio: suggestedBio,
    };
  };

  const handleDiningTagToggle = (tag: string) => {
    setDiningTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!nickname.trim()) return;
    const p: UserProfile = {
      id: `user-${Date.now()}`,
      nickname: nickname.trim(),
      avatar,
      university: selectedUni,
      major: major.trim() || "未填写",
      year,
      gender,
      diningTags: Array.from(diningTags),
      bio: bio.trim(),
    };
    if (profile) p.id = profile.id;
    saveProfile(p);
    setProfile(p);
    setIsSetup(false);
    setIsEditing(false);
  };

  const handleRemoveFriend = (id: string) => {
    removeFriend(id);
    setFriends(getFriends());
  };

  const handleEdit = () => {
    if (profile) {
      setNickname(profile.nickname);
      setAvatar(profile.avatar);
      setMajor(profile.major);
      setYear(profile.year);
      setGender(profile.gender);
      setSelectedUni(profile.university);
      setDiningTags(new Set(profile.diningTags || []));
      setBio(profile.bio || "");
    }
    setIsEditing(true);
  };

  const getYearLabel = (y: string) => {
    if (y.startsWith("研")) return "研究生";
    return "本科生";
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return `${min}分钟前`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}小时前`;
    const day = Math.floor(hour / 24);
    if (day < 7) return `${day}天前`;
    return new Date(ts).toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    });
  };

  const toggleTool = (key: string) => {
    setExpandedTool((prev) => (prev === key ? null : key));
  };

  const handleBindMeituan = () => {
    if (meituanBound) return;
    setMeituanBound(true);
    localStorage.setItem("campus_food_meituan_bound", "true");
    setShowBindSuccess(true);
    setTimeout(() => setShowBindSuccess(false), 2500);
  };

  // 设置/编辑卡片
  if (isSetup || isEditing) {
    const aiProfile = generateProfileFromDNA();
    const hasAIData = aiProfile !== null;

    return (
      <div className="page profile-page">
        <div className="profile-setup-card">
          <h2 className="profile-setup-title">
            {isEditing
              ? "编辑干饭档案"
              : hasAIData
                ? "团子已经帮你填好了"
                : "建立你的干饭档案"}
          </h2>
          <p className="profile-setup-subtitle">
            {isEditing
              ? "更新一下你的干饭人设"
              : hasAIData
                ? "看看准不准，不满意就改改"
                : "填完就能愉快地找饭搭子啦"}
          </p>

          {/* 头像选择 */}
          <div className="profile-field">
            <label className="profile-label">你的专属表情</label>
            <div className="profile-avatar-grid">
              {avatarOptions.map((e) => (
                <span
                  key={e}
                  className={`profile-avatar-option ${avatar === e ? "selected" : ""}`}
                  onClick={() => setAvatar(e)}
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* 昵称 */}
          <div className="profile-field">
            <label className="profile-label">
              江湖称号
              {hasAIData && !isEditing && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "12px",
                    color: "#06C167",
                  }}
                >
                  ✨ AI推荐
                </span>
              )}
            </label>
            <input
              type="text"
              className="profile-input"
              placeholder="如：干饭王小李、奶茶续命人"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
            />
          </div>

          {/* 学校 */}
          <div className="profile-field">
            <label className="profile-label">所在学校</label>
            <select
              className="profile-select"
              value={selectedUni}
              onChange={(e) => setSelectedUni(e.target.value as University)}
            >
              {universities.map((uni) => (
                <option key={uni.id} value={uni.name}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>

          {/* 专业 */}
          <div className="profile-field">
            <label className="profile-label">专业</label>
            <input
              type="text"
              className="profile-input"
              placeholder="如：计算机科学与技术"
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              maxLength={20}
            />
          </div>

          {/* 年级 */}
          <div className="profile-field">
            <label className="profile-label">年级</label>
            <div className="profile-year-options">
              {yearOptions.map((y) => (
                <span
                  key={y}
                  className={`profile-year-option ${year === y ? "selected" : ""}`}
                  onClick={() => setYear(y)}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>

          {/* 性别 */}
          <div className="profile-field">
            <label className="profile-label">性别</label>
            <div className="profile-gender-options">
              <span
                className={`profile-gender-option ${gender === "male" ? "selected" : ""}`}
                onClick={() => setGender("male")}
              >
                男
              </span>
              <span
                className={`profile-gender-option ${gender === "female" ? "selected" : ""}`}
                onClick={() => setGender("female")}
              >
                女
              </span>
            </div>
          </div>

          {/* 干饭人设标签 */}
          <div className="profile-field">
            <label className="profile-label">干饭人设（选出你的标签）</label>
            {diningTagOptions.map((group) => (
              <div key={group.group} className="profile-dining-group">
                <span className="profile-dining-group-label">
                  {group.group}
                </span>
                <div className="profile-dining-tags">
                  {group.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`profile-dining-tag ${diningTags.has(tag) ? "selected" : ""}`}
                      onClick={() => handleDiningTagToggle(tag)}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 干饭语录 */}
          <div className="profile-field">
            <label className="profile-label">干饭语录（你的美食座右铭）</label>
            <input
              type="text"
              className="profile-input"
              placeholder={
                bioPlaceholders[
                  Math.floor(Math.random() * bioPlaceholders.length)
                ]
              }
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={30}
            />
          </div>

          <div className="profile-setup-actions">
            {isEditing && (
              <button
                className="profile-cancel-btn"
                onClick={() => setIsEditing(false)}
              >
                算了
              </button>
            )}
            <button
              className={`profile-save-btn ${!nickname.trim() ? "disabled" : ""}`}
              onClick={handleSave}
              disabled={!nickname.trim()}
            >
              {isEditing ? "更新人设" : "开始干饭之旅"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 个人主页展示
  return (
    <div className="page profile-page">
      {/* 用户信息卡 + 校园认证 */}
      {profile && (
        <div className="profile-info-card">
          <div className="profile-info-main">
            <span className="profile-info-avatar">{profile.avatar}</span>
            <div className="profile-info-text">
              <span className="profile-info-name">{profile.nickname}</span>
              <span className="profile-campus-badge">
                <span className="profile-campus-badge-icon">🎓</span>
                已认证 {profile.university} {getYearLabel(profile.year)}
              </span>
              <span className="profile-info-detail">
                {profile.major} · {profile.year}
              </span>
            </div>
          </div>
          <button className="profile-edit-btn" onClick={handleEdit}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
            编辑
          </button>
        </div>
      )}

      {/* 干饭语录 */}
      {profile?.bio && (
        <div className="profile-bio-card">
          <span className="profile-bio-quote">"</span>
          <span className="profile-bio-text">{profile.bio}</span>
          <span className="profile-bio-quote">"</span>
        </div>
      )}

      {/* 干饭人设 */}
      {profile && (profile.diningTags?.length ?? 0) > 0 && (
        <div className="profile-section">
          <div className="profile-section-header">
            <h3 className="profile-section-title">干饭人设</h3>
          </div>
          <div className="profile-persona-tags">
            {profile.diningTags.map((tag) => (
              <span key={tag} className="profile-persona-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ===== 美团生态模块（优先级提升） ===== */}
      <div className="profile-meituan-card">
        <div className="profile-meituan-header">
          <div className="profile-meituan-logo">
            <span className="profile-meituan-logo-icon">美</span>
            <span className="profile-meituan-logo-text">美团学生版</span>
          </div>
          {meituanBound ? (
            <span className="profile-meituan-bound">已绑定 ✓</span>
          ) : (
            <button
              className="profile-meituan-bind-btn"
              onClick={handleBindMeituan}
            >
              一键绑定
            </button>
          )}
        </div>

        {meituanBound ? (
          <>
            <div className="profile-meituan-stats">
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">
                  ¥{meituanStats.saved}
                </span>
                <span className="profile-meituan-stat-label">本月已省</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">
                  {meituanStats.orders}
                </span>
                <span className="profile-meituan-stat-label">订单</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">
                  {meituanStats.coupons}
                </span>
                <span className="profile-meituan-stat-label">待用券</span>
              </div>
              <div className="profile-meituan-stat">
                <span className="profile-meituan-stat-value">
                  {meituanStats.points}
                </span>
                <span className="profile-meituan-stat-label">积分</span>
              </div>
            </div>
            <div
              className="profile-meituan-coupon-toggle"
              onClick={() => setShowCoupons(!showCoupons)}
            >
              <span>{showCoupons ? "收起学生福利" : "展开查看学生福利"}</span>
              <span
                className={`profile-meituan-coupon-arrow ${showCoupons ? "expanded" : ""}`}
              >
                ›
              </span>
            </div>
            {showCoupons && (
              <div className="profile-coupon-list">
                <div className="profile-coupon">
                  <div className="profile-coupon-left">
                    <span className="profile-coupon-amount">
                      5<small>元</small>
                    </span>
                  </div>
                  <div className="profile-coupon-right">
                    <span className="profile-coupon-title">新人到店红包</span>
                    <span className="profile-coupon-rule">
                      满20可用 · 限堂食
                    </span>
                    <span className="profile-coupon-expire">3天后过期</span>
                  </div>
                  <button className="profile-coupon-btn">领取</button>
                </div>
                <div className="profile-coupon">
                  <div className="profile-coupon-left monthly">
                    <span className="profile-coupon-amount">
                      9.9<small>/月</small>
                    </span>
                  </div>
                  <div className="profile-coupon-right">
                    <span className="profile-coupon-title">学生免配送月卡</span>
                    <span className="profile-coupon-rule">
                      每单免配送费 · 限学生认证
                    </span>
                    <span className="profile-coupon-expire">长期有效</span>
                  </div>
                  <button className="profile-coupon-btn">开通</button>
                </div>
                <div className="profile-coupon">
                  <div className="profile-coupon-left group">
                    <span className="profile-coupon-amount">
                      7<small>折</small>
                    </span>
                  </div>
                  <div className="profile-coupon-right">
                    <span className="profile-coupon-title">校园拼团特惠</span>
                    <span className="profile-coupon-rule">
                      3人成团享7折 · 指定商户
                    </span>
                    <span className="profile-coupon-expire">本周有效</span>
                  </div>
                  <button className="profile-coupon-btn">去拼团</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="profile-meituan-hint">
            绑定后解锁：学生专属优惠 · 口味分析更精准
          </p>
        )}
      </div>

      {/* 干饭工具箱（优先级提升） */}
      <div className="profile-section">
        <h3 className="profile-section-title">干饭工具箱</h3>
        <div className="profile-toolbox">
          {/* 今天吃什么 — 随机吃历史 */}
          <div className="profile-tool-item">
            <div
              className="profile-tool-header"
              onClick={() => toggleTool("random")}
            >
              <span className="profile-tool-icon">🎲</span>
              <span className="profile-tool-label">今天吃什么</span>
              <span className="profile-tool-count">
                {randomHistory.length}次
              </span>
              <span
                className={`profile-tool-arrow ${expandedTool === "random" ? "expanded" : ""}`}
              >
                ›
              </span>
            </div>
            {expandedTool === "random" && (
              <div className="profile-tool-content">
                {randomHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没转过命运转盘</p>
                    <button
                      className="profile-tool-go"
                      onClick={() => navigate("/random")}
                    >
                      去试试手气
                    </button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {randomHistory.slice(0, 10).map((item, i) => (
                      <div
                        key={i}
                        className="profile-tool-record"
                        onClick={() =>
                          navigate(`/restaurant/${item.restaurantId}`)
                        }
                      >
                        <img
                          className="profile-tool-record-img"
                          src={item.image}
                          alt={item.restaurantName}
                        />
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">
                            {item.restaurantName}
                          </span>
                          <span className="profile-tool-record-meta">
                            {item.category} · ¥{item.avgPrice}/人 ·{" "}
                            {item.rating}分
                          </span>
                        </div>
                        <span className="profile-tool-record-time">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))}
                    {randomHistory.length > 10 && (
                      <div className="profile-tool-more">
                        还有 {randomHistory.length - 10} 条记录
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我的拼单 — 拼单历史 */}
          <div className="profile-tool-item">
            <div
              className="profile-tool-header"
              onClick={() => toggleTool("group")}
            >
              <span className="profile-tool-icon">🤝</span>
              <span className="profile-tool-label">我的拼单</span>
              <span className="profile-tool-count">
                {groupHistory.length}次
              </span>
              <span
                className={`profile-tool-arrow ${expandedTool === "group" ? "expanded" : ""}`}
              >
                ›
              </span>
            </div>
            {expandedTool === "group" && (
              <div className="profile-tool-content">
                {groupHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没发起过拼单</p>
                    <button
                      className="profile-tool-go"
                      onClick={() => navigate("/group")}
                    >
                      去拼单广场
                    </button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {groupHistory.slice(0, 10).map((item, i) => (
                      <div
                        key={i}
                        className="profile-tool-record"
                        onClick={() =>
                          navigate(`/restaurant/${item.restaurantId}`)
                        }
                      >
                        <span
                          className={`profile-tool-record-mode ${item.mode}`}
                        >
                          {item.mode === "offline" ? "线下" : "线上"}
                        </span>
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">
                            {item.restaurantName}
                          </span>
                          <span className="profile-tool-record-meta">
                            {item.targetPeople}人拼 ·{" "}
                            {item.message.slice(0, 20)}
                            {item.message.length > 20 ? "..." : ""}
                          </span>
                        </div>
                        <span className="profile-tool-record-time">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))}
                    {groupHistory.length > 10 && (
                      <div className="profile-tool-more">
                        还有 {groupHistory.length - 10} 条记录
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 今日翻牌 — 翻牌历史 */}
          <div className="profile-tool-item">
            <div
              className="profile-tool-header"
              onClick={() => toggleTool("flip")}
            >
              <span className="profile-tool-icon">🎴</span>
              <span className="profile-tool-label">今日翻牌</span>
              <span className="profile-tool-count">{flipHistory.length}次</span>
              <span
                className={`profile-tool-arrow ${expandedTool === "flip" ? "expanded" : ""}`}
              >
                ›
              </span>
            </div>
            {expandedTool === "flip" && (
              <div className="profile-tool-content">
                {flipHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没参与过翻牌活动</p>
                    <button
                      className="profile-tool-go"
                      onClick={() => navigate("/")}
                    >
                      去首页翻牌
                    </button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {flipHistory.slice(0, 10).map((item, i) => (
                      <div
                        key={i}
                        className="profile-tool-record"
                        onClick={() =>
                          navigate(`/restaurant/${item.restaurantId}`)
                        }
                      >
                        <span
                          className={`profile-tool-record-action ${item.action}`}
                        >
                          {item.action === "join"
                            ? "参与"
                            : item.action === "vote"
                              ? "投票"
                              : "提名"}
                        </span>
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">
                            {item.restaurantName}
                          </span>
                          <span className="profile-tool-record-meta">
                            {item.detail}
                          </span>
                        </div>
                        <span className="profile-tool-record-time">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 我逛过的店 — 浏览足迹 */}
          <div className="profile-tool-item">
            <div
              className="profile-tool-header"
              onClick={() => toggleTool("visit")}
            >
              <span className="profile-tool-icon">👣</span>
              <span className="profile-tool-label">我逛过的店</span>
              <span className="profile-tool-count">
                {visitHistory.length}家
              </span>
              <span
                className={`profile-tool-arrow ${expandedTool === "visit" ? "expanded" : ""}`}
              >
                ›
              </span>
            </div>
            {expandedTool === "visit" && (
              <div className="profile-tool-content">
                {visitHistory.length === 0 ? (
                  <div className="profile-tool-empty">
                    <p>还没逛过任何店铺</p>
                    <button
                      className="profile-tool-go"
                      onClick={() => navigate("/list")}
                    >
                      去发现好店
                    </button>
                  </div>
                ) : (
                  <div className="profile-tool-list">
                    {visitHistory.slice(0, 10).map((item, i) => (
                      <div
                        key={i}
                        className="profile-tool-record"
                        onClick={() =>
                          navigate(`/restaurant/${item.restaurantId}`)
                        }
                      >
                        <img
                          className="profile-tool-record-img"
                          src={item.image}
                          alt={item.restaurantName}
                        />
                        <div className="profile-tool-record-info">
                          <span className="profile-tool-record-name">
                            {item.restaurantName}
                          </span>
                          <span className="profile-tool-record-meta">
                            {item.category} · ¥{item.avgPrice}/人
                          </span>
                        </div>
                        <span className="profile-tool-record-time">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))}
                    {visitHistory.length > 10 && (
                      <div className="profile-tool-more">
                        还有 {visitHistory.length - 10} 家店
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== AI 功能区（团子眼中的你） ===== */}
      {userInsights &&
      userInsights.taste &&
      userInsights.consumption &&
      userInsights.social &&
      userInsights.explore &&
      userInsights.taste.topCategories.length > 0 ? (
        <div className="profile-section">
          <h3 className="profile-section-title">团子·干饭顾问</h3>

          {/* 团子眼中的你 - 可点击卡片 */}
          <div
            className="profile-tuanzi-card"
            onClick={() => navigate("/profile/tuanzi")}
          >
            <div className="profile-tuanzi-hero">
              <div className="profile-tuanzi-hero-bg"></div>
              <div className="profile-tuanzi-hero-content">
                <img
                  className="profile-tuanzi-hero-avatar"
                  src="/tuanzi.png"
                  alt="团子"
                />
              </div>
            </div>
            <div className="profile-tuanzi-arrow">
              <span>团子眼中的你</span>
              <span className="arrow-icon">›</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 饭搭子列表 */}
      <div className="profile-section">
        <div className="profile-section-header">
          <h3 className="profile-section-title">我的饭搭子</h3>
          <span className="profile-section-count">{friends.length}人</span>
        </div>
        {friends.length === 0 ? (
          <div className="profile-empty">
            <span className="profile-empty-icon">🍜</span>
            <p>还没有饭搭子</p>
            <p className="profile-empty-hint">去拼单广场勾搭一下同学吧</p>
            <button
              className="profile-go-btn"
              onClick={() => navigate("/group")}
            >
              去拼单广场
            </button>
          </div>
        ) : (
          <div className="profile-friend-list">
            {friends.map((f) => (
              <div key={f.id} className="profile-friend-item">
                <span className="profile-friend-avatar">{f.avatar}</span>
                <div className="profile-friend-info">
                  <span className="profile-friend-name">{f.name}</span>
                  <span className="profile-friend-detail">
                    {f.university.replace("北京", "").replace("大学", "")} ·{" "}
                    {f.major} · {f.year}
                  </span>
                </div>
                <button
                  className="profile-friend-remove"
                  onClick={() => handleRemoveFriend(f.id)}
                >
                  不搭了
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast 提示 */}
      {showBindSuccess && (
        <div className="toast">绑定成功！已解锁学生专享福利</div>
      )}
    </div>
  );
}
