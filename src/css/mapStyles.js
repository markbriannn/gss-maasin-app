import {StyleSheet, Dimensions} from 'react-native';

const {width} = Dimensions.get('window');

export const mapStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  
  // Search Bar
  searchContainer: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 70,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    marginLeft: 6,
    paddingVertical: 2,
  },
  filterButton: {
    padding: 8,
  },
  
  // Category Chips
  categoryChipsContainer: {
    position: 'absolute',
    top: 8,
    left: 70,
    right: 60,
    zIndex: 4,
  },
  categoryChipsScroll: {
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: '#00B14F',
  },
  categoryChipIcon: {
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  
  // Bottom Panel
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  panelHandle: {
    width: 50,
    height: 5,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  panelContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  // Provider Card (in panel)
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  providerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  providerRatingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  providerDistance: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  providerActions: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  viewProfileButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#00B14F',
    marginBottom: 8,
  },
  viewProfileButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00B14F',
  },
  hireButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#00B14F',
  },
  hireButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Floating Buttons
  floatingButtonContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 15,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  myLocationButton: {
    bottom: 420,
  },
  notificationButton: {
    top: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Map Markers
  markerContainer: {
    alignItems: 'center',
  },
  providerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  providerMarkerImage: {
    width: '100%',
    height: '100%',
  },
  serviceBadge: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Marker Popup
  markerPopup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  markerPopupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  markerPopupRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  markerPopupButton: {
    backgroundColor: '#00B14F',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  markerPopupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Cluster Marker
  clusterMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00B14F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  clusterMarkerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
