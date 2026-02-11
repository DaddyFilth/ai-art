import { SetMetadata } from '@nestjs/common';

export const MATURE_KEY = 'mature';
export const Mature = () => SetMetadata(MATURE_KEY, true);
