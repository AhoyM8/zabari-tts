# Zabari TTS Documentation

## Available Documentation

### [Release Guide](./RELEASE-GUIDE.md) ⭐ START HERE
Quick reference for creating releases and publishing updates.

**Use this if you want to:**
- Create a new release
- Publish updates to users
- Learn the release workflow

**Topics covered:**
- First-time GitHub setup
- Creating releases (patch/minor/major)
- Version numbering
- Troubleshooting common issues

---

### [Auto-Update System](./AUTO-UPDATE.md) 📖 DETAILED GUIDE
Comprehensive documentation of the auto-update system.

**Use this if you want to:**
- Understand how auto-updates work
- Configure advanced settings
- Troubleshoot update issues
- Implement custom update flows

**Topics covered:**
- Architecture and update flow
- Configuration options
- Security considerations
- Testing and debugging
- Code signing
- Advanced features (beta channels, staged rollouts)

---

## Quick Commands

```bash
# Pre-release validation
npm run release:check

# Create releases
npm run release:patch    # Bug fixes:     1.0.0 → 1.0.1
npm run release:minor    # New features:  1.0.0 → 1.1.0
npm run release:major    # Breaking:      1.0.0 → 2.0.0
npm run release:draft    # Draft release (test before publishing)

# Build without publishing
npm run dist             # Local build
npm run pack             # Build unpacked (for testing)
```

## Need Help?

1. **Quick questions?** See [RELEASE-GUIDE.md](./RELEASE-GUIDE.md)
2. **Deep dive?** See [AUTO-UPDATE.md](./AUTO-UPDATE.md)
3. **Issues?** Open issue on GitHub
4. **Main docs?** See [CLAUDE.md](../CLAUDE.md) in root directory

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| RELEASE-GUIDE.md | ✓ Complete | 2025-11-22 |
| AUTO-UPDATE.md | ✓ Complete | 2025-11-22 |

---

**Zabari TTS** - Multi-platform chat logger with TTS for live streaming
