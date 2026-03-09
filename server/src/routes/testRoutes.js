const express = require("express");
const router = express.Router();
const supabase = require("../config/supabaseClient");

router.get("/supabase", async (req, res) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*").limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Supabase query failed",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "Supabase connected successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
});

module.exports = router;