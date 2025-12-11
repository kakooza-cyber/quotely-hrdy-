//backend/routes/proverbs.js
import express from 'express';
import { supabase } from '../supabase/client.js';

const router = express.Router();

// GET all proverbs
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('proverbs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Error fetching proverbs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proverbs'
    });
  }
});

// GET single proverb by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('proverbs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching proverb:', error);
    res.status(404).json({
      success: false,
      error: 'Proverb not found'
    });
  }
});

export default router;
