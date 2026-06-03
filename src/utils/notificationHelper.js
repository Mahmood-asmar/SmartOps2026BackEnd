import db from "../config/db.js";

const createNotification = async ({ io, message, type, alert_user }) => {
  const [result] = await db.query(
    `INSERT INTO notifications (message, type, alert_user)
     VALUES (?, ?, ?)`,
    [message, type, alert_user]
  );

  const notification = {
    notification_id: result.insertId,
    message,
    type,
    alert_user,
    is_read: false,
    created_at: new Date(),
  };

  if (io) {
    io.to(`user_${alert_user}`).emit("new_notification", notification);
  }

  return notification;
};

export default createNotification;