// Setting either URL adds a Google Forms section to /privacy: update its 最終更新 date when you do.

// Prefectures the region search lists (Kanto for now). After changing this, rebuild the town list:
// npm run municipalities -- <総務省 code list .xlsx>
export const SEARCH_PREFECTURES = ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'];

// Google Form for people who want to get involved. Leave empty to hide the link.
export const JOIN_FORM_URL = '';

// Google Form for asking us to cover a region that isn't live yet. Leave empty to hide the link.
export const REGION_REQUEST_URL = '';
