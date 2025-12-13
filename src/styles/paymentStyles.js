export const paymentStyles = {
  // ========== Payment Methods Screen ==========
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  methodsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  methodCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  methodInfo: {
    flex: 1,
  },
  methodBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  methodExpiry: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  defaultBadge: {
    backgroundColor: '#27AE60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },

  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  methodButtonActive: {
    backgroundColor: '#FF6B35',
  },
  methodButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
    marginLeft: 6,
  },
  methodButtonDanger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FADBD8',
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  methodButtonDangerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E74C3C',
    marginLeft: 6,
  },

  addButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },

  // ========== Wallet Screen ==========
  cardsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  earningsCard: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFF',
  },

  statsRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 8,
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 4,
  },

  setupBox: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF5F1',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
  },
  setupContent: {
    flex: 1,
    marginLeft: 12,
  },
  setupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  setupText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
  },
  setupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B35',
    borderRadius: 6,
  },
  setupButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  payoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#27AE60',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payoutButtonDisabled: {
    backgroundColor: '#BDC3C7',
  },
  payoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },

  historySection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
  emptyHistory: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#95A5A6',
  },

  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#7F8C8D',
    paddingTop: 8,
  },

  // ========== Transaction History Screen ==========
  filterScroll: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },

  transactionsList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  transactionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  transactionDate: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 2,
  },
  transactionDescription: {
    fontSize: 11,
    color: '#BDC3C7',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  summaryFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#DEE2E6',
  },

  // ========== Payout Setup Screen ==========
  setupContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  setupIconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },

  benefitsList: {
    marginBottom: 24,
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
  },

  requirementsBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  requirementBullet: {
    fontSize: 16,
    color: '#FF6B35',
    marginRight: 12,
  },
  requirementText: {
    fontSize: 14,
    color: '#7F8C8D',
  },

  setupButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  setupPrimaryButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  setupSecondaryButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  setupSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  trustBadgeText: {
    fontSize: 12,
    color: '#95A5A6',
    marginLeft: 6,
  },

  // Progress
  progressBar: {
    height: 4,
    backgroundColor: '#E9ECEF',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '66%',
    backgroundColor: '#FF6B35',
  },

  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 20,
  },

  form: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },

  businessTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  businessTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  businessTypeButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  businessTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  businessTypeButtonTextActive: {
    color: '#FFF',
  },

  // Success
  successIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 24,
  },

  // ========== Common Styles ==========
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    marginTop: 4,
  },

  infoBox: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#EBF5FB',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
    flexDirection: 'row',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
};

export default paymentStyles;
