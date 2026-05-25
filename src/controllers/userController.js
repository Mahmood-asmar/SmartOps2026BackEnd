import bcrypt from "bcryptjs";
import db from "../config/db.js";

const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC"
    );

    return res.json({
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(500).json({
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?",
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      message: "User fetched successfully",
      user: users[0],
    });
  } catch (error) {
    console.error("Get user by id error:", error);

    return res.status(500).json({
      message: "Failed to fetch user",
      error: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    const [existingUser] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [cleanName, cleanEmail, hashedPassword, role]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: {
        user_id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Failed to create user",
      error: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;

    const [users] = await db.query("SELECT * FROM users WHERE user_id = ?", [
      id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const updates = {};
    const values = [];

    if (name) {
      updates.name = name.trim();
    }

    if (email) {
      const cleanEmail = email.toLowerCase().trim();

      const [existingEmail] = await db.query(
        "SELECT user_id FROM users WHERE email = ? AND user_id != ?",
        [cleanEmail, id]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      updates.email = cleanEmail;
    }

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (role) {
      updates.role = role;
    }

    const updateFields = Object.keys(updates);

    if (updateFields.length === 0) {
      return res.status(400).json({
        message: "No fields provided for update",
      });
    }

    const setClause = updateFields.map((field) => `${field} = ?`).join(", ");

    updateFields.forEach((field) => values.push(updates[field]));
    values.push(id);

    await db.query(`UPDATE users SET ${setClause} WHERE user_id = ?`, values);

    const [updatedUsers] = await db.query(
      "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?",
      [id]
    );

    return res.json({
      message: "User updated successfully",
      user: updatedUsers[0],
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.user_id) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    const [users] = await db.query("SELECT user_id FROM users WHERE user_id = ?", [
      id,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await db.query("DELETE FROM users WHERE user_id = ?", [id]);

    return res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);

    return res.status(500).json({
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

export { getAllUsers, getUserById, createUser, updateUser, deleteUser };