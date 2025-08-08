import express from 'express';
import { Squad, SquadDocument } from '../models/Squad';
import { User } from '../models/User';

const router = express.Router();

// Get all squads
router.get('/', async (req, res) => {
  try {
    const squads = await Squad.find()
      .sort({ createdAt: -1 })
      .lean();
    
    return res.json(squads);
  } catch (error) {
    console.error('Error fetching squads:', error);
    return res.status(500).json({ error: 'Failed to fetch squads' });
  }
});

// Get squad by ID
router.get('/:id', async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id).lean();
    
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    return res.json(squad);
  } catch (error) {
    console.error('Error fetching squad:', error);
    return res.status(500).json({ error: 'Failed to fetch squad' });
  }
});

// Create new squad
router.post('/', async (req, res) => {
  try {
    const { name, description, color, createdBy } = req.body;
    
    if (!name || !createdBy) {
      return res.status(400).json({ error: 'Name and createdBy are required' });
    }
    
    // Check if squad name already exists
    const existingSquad = await Squad.findOne({ name: name.trim() });
    if (existingSquad) {
      return res.status(400).json({ error: 'Squad name already exists' });
    }
    
    const squad = new Squad({
      name: name.trim(),
      description: description || '',
      color: color || '#3b82f6',
      createdBy,
      members: []
    });
    
    await squad.save();
    return res.status(201).json(squad);
  } catch (error) {
    console.error('Error creating squad:', error);
    return res.status(500).json({ error: 'Failed to create squad' });
  }
});

// Update squad
router.put('/:id', async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    // Check if new name conflicts with existing squad
    if (name && name !== squad.name) {
      const existingSquad = await Squad.findOne({ name: name.trim(), _id: { $ne: req.params.id } });
      if (existingSquad) {
        return res.status(400).json({ error: 'Squad name already exists' });
      }
    }
    
    squad.name = name || squad.name;
    squad.description = description !== undefined ? description : squad.description;
    squad.color = color || squad.color;
    
    await squad.save();
    return res.json(squad);
  } catch (error) {
    console.error('Error updating squad:', error);
    return res.status(500).json({ error: 'Failed to update squad' });
  }
});

// Delete squad
router.delete('/:id', async (req, res) => {
  try {
    const squad = await Squad.findByIdAndDelete(req.params.id);
    
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    return res.json({ message: 'Squad deleted successfully' });
  } catch (error) {
    console.error('Error deleting squad:', error);
    return res.status(500).json({ error: 'Failed to delete squad' });
  }
});

// Add members to squad
router.post('/:id/members', async (req, res) => {
  try {
    const { memberIds } = req.body;
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds array is required' });
    }
    
    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    // Get user details for the member IDs
    const users = await User.find({ userId: { $in: memberIds } });
    const userMap = new Map(users.map(user => [user.userId, user]));
    
    // Add new members
    const newMembers = memberIds
      .filter(userId => !squad.members.some(member => member.userId === userId))
      .map(userId => {
        const user = userMap.get(userId);
        if (!user) {
          throw new Error(`User with ID ${userId} not found`);
        }
        return {
          userId: user.userId,
          userName: user.userName,
          email: user.email,
          role: 'Member', // Default role
          joinedAt: new Date()
        };
      });
    
    squad.members.push(...newMembers);
    await squad.save();
    
    return res.json(squad);
  } catch (error) {
    console.error('Error adding members to squad:', error);
    return res.status(500).json({ error: 'Failed to add members to squad' });
  }
});

// Remove member from squad
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    const memberIndex = squad.members.findIndex(member => member.userId === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found in squad' });
    }
    
    squad.members.splice(memberIndex, 1);
    await squad.save();
    
    return res.json(squad);
  } catch (error) {
    console.error('Error removing member from squad:', error);
    return res.status(500).json({ error: 'Failed to remove member from squad' });
  }
});

// Update member role
router.put('/:id/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    const member = squad.members.find(m => m.userId === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found in squad' });
    }
    
    member.role = role;
    await squad.save();
    
    return res.json(squad);
  } catch (error) {
    console.error('Error updating member role:', error);
    return res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Get available users (users not in the squad)
router.get('/:id/available-users', async (req, res) => {
  try {
    const squad = await Squad.findById(req.params.id);
    if (!squad) {
      return res.status(404).json({ error: 'Squad not found' });
    }
    
    const squadMemberIds = squad.members.map(member => member.userId);
    
    const availableUsers = await User.find({
      userId: { $nin: squadMemberIds }
    }).select('userId userName email').lean();
    
    return res.json(availableUsers);
  } catch (error) {
    console.error('Error fetching available users:', error);
    return res.status(500).json({ error: 'Failed to fetch available users' });
  }
});

// Get all users (for squad management)
router.get('/users/all', async (req, res) => {
  try {
    const users = await User.find()
      .select('userId userName email')
      .sort({ userName: 1 })
      .lean();
    
    return res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router; 