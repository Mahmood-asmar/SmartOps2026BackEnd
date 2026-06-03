import db from "../config/db.js";

const getMyNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      `
      SELECT
        notification_id,
        message,
        type,
        alert_user,
        created_at,
        is_read
      FROM notifications
      WHERE alert_user = ?
      ORDER BY created_at DESC
      `,
      [req.user.user_id]
    );

    return res.json({
      message: "Notifications fetched successfully",
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Failed to fetch notifications",
      error: error.message,
    });
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE notification_id = ?",
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    const notification = notifications[0];

    if (notification.alert_user !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this notification does not belong to you",
      });
    }

    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE notification_id = ?",
      [id]
    );

    return res.json({
      message: "Notification marked as read successfully",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      message: "Failed to mark notification as read",
      error: error.message,
    });
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE alert_user = ?",
      [req.user.user_id]
    );

    return res.json({
      message: "All notifications marked as read successfully",
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      message: "Failed to mark all notifications as read",
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const [notifications] = await db.query(
      "SELECT * FROM notifications WHERE notification_id = ?",
      [id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    const notification = notifications[0];

    if (notification.alert_user !== req.user.user_id) {
      return res.status(403).json({
        message: "Access denied, this notification does not belong to you",
      });
    }

    await db.query("DELETE FROM notifications WHERE notification_id = ?", [id]);

    return res.json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      message: "Failed to delete notification",
      error: error.message,
    });
  }
};

export {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};