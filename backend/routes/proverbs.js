import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { DatabaseQueries } from '../supabase/queries.js';

const router = express.Router();

// Get all proverbs (public)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filters = {};

    if (req.query.origin) filters.origin = req.query.origin;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search) filters.search = req.query.search;
    
    // Admin can see all statuses
    if (req.query.status && req.query.status === 'all') {
      filters.status = 'all';
    }

    const { data, error, count } = await DatabaseQueries.getProverbs(page, limit, filters);

    if (error) throw error;

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get proverbs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proverbs',
      message: error.message
    });
  }
});

// Get random proverb
router.get('/random', async (req, res) => {
  try {
    const { data, error } = await DatabaseQueries.getRandomProverb();

    if (error) throw error;

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Random proverb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get random proverb'
    });
  }
});

// Get proverb by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await DatabaseQueries.getProverbById(id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Proverb not found'
        });
      }
      throw error;
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get proverb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proverb'
    });
  }
});

// Submit new proverb (authenticated)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, meaning, origin, category, tags } = req.body;
    const userId = req.user.id;

    if (!content || !meaning) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Content and meaning are required'
      });
    }

    const proverbData = {
      content,
      meaning,
      origin: origin || null,
      category: category || null,
      tags: tags || [],
      submitted_by: userId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { data, error } = await DatabaseQueries.createProverb(proverbData);

    if (error) throw error;

    res.status(201).json({
      success: true,
      data,
      message: 'Proverb submitted for review'
    });

  } catch (error) {
    console.error('Submit proverb error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit proverb'
    });
  }
});

// Update proverb status (admin only)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin (you need to implement admin check)
    // const isAdmin = req.user.role === 'admin';
    // if (!isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     error: 'Unauthorized',
    //     message: 'Admin access required'
    //   });
    // }

    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Status must be pending, approved, or rejected'
      });
    }

    const { data, error } = await supabase
      .from('proverbs')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data,
      message: `Proverb ${status}`
    });

  } catch (error) {
    console.error('Update proverb status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update proverb status'
    });
  }
});

export default router;
