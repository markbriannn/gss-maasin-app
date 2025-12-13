import React from 'react';
import {View, TextInput, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {searchBarStyles} from '../css/componentStyles';

const SearchBar = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFilterPress,
  onClear,
  showFilter = false,
  autoFocus = false,
  style,
}) => {
  return (
    <View style={[searchBarStyles.container, style]}>
      <Icon name="search" size={20} color="#9CA3AF" style={searchBarStyles.searchIcon} />
      
      <TextInput
        style={searchBarStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        autoFocus={autoFocus}
      />
      
      {value && onClear && (
        <TouchableOpacity onPress={onClear} style={searchBarStyles.clearButton}>
          <Icon name="close-circle" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
      
      {showFilter && onFilterPress && (
        <TouchableOpacity onPress={onFilterPress} style={searchBarStyles.filterButton}>
          <Icon name="options" size={20} color="#00B14F" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SearchBar;
