/**
 * Utility for date and time formatting
 */

/**
 * Format: DD/MM/YYYY (using en-GB locale)
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateGB = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";
  return d.toLocaleDateString("en-GB");
};

/**
 * Format: YYYY-MM-DD HH:mm:ss
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateTimeSQL = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format: DD-MM-YYYY
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateDash = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${day}-${month}-${year}`;
};

/**
 * Format: DD-MM-YYYY HH:mm:ss
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateTimeDash = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Format: dd MMM yyyy, hh:mm AM/PM
 * Example: 11 Apr 2026, 02:30 PM
 * @param {string|Date} date 
 * @returns {string}
 */
export const formatDateTimeFull = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";

  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hh = String(hours).padStart(2, '0');

  return `${day} ${month} ${year}, ${hh}:${minutes} ${ampm}`;
};

/**
 * Format relative time: "just now", "5m ago", "2h ago", "3d ago"
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return "now";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "now";
  
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default {
    formatDateGB,
    formatDateTimeSQL,
    formatDateDash,
    formatDateTimeDash,
    formatDateTimeFull,
    formatRelativeTime
};
