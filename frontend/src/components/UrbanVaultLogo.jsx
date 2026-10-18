import React from 'react'
import { Box } from '@mui/material'

/**
 * Official UrbanVault Brand Logo / Mark
 * Extracted directly from official urbanvault.in vector assets
 */
export const UrbanVaultLogo = ({ size = 28, color = 'currentColor', sx = {}, ...props }) => {
  return (
    <Box
      component="svg"
      viewBox="38 58 178 80"
      sx={{
        width: size,
        height: size * (80 / 178),
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...sx,
      }}
      {...props}
    >
      <g transform="translate(0,206) scale(0.1,-0.1)" fill={color} stroke="none">
        <path d="M447 1393 c-4 -3 -7 -113 -7 -243 l0 -237 30 -61 c36 -72 92 -125 169 -160 82 -38 192 -37 278 2 73 33 144 103 176 174 20 43 22 66 25 275 2 166 0 232 -9 243 -9 12 -66 14 -334 14 -177 0 -325 -3 -328 -7z" />
        <path d="M1222 1388 c-7 -7 -12 -19 -12 -27 0 -14 319 -581 362 -643 12 -17 29 -28 42 -28 20 0 50 47 210 324 102 178 186 333 186 343 0 42 -8 43 -400 43 -279 0 -379 -3 -388 -12z" />
      </g>
    </Box>
  )
}

export default UrbanVaultLogo
