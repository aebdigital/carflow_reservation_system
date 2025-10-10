import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';

const TranslationButton = ({ onClick, tooltip = 'English Translation', size = 'small' }) => {
  return (
    <Tooltip title={tooltip}>
      <IconButton color="primary" size={size} onClick={onClick}>
        <LanguageIcon />
      </IconButton>
    </Tooltip>
  );
};

export default TranslationButton;
