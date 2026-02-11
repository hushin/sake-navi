'use client';

import Link from 'next/link';
import React from 'react';

export function NoPrefetchLink(props: React.ComponentPropsWithRef<typeof Link>) {
  return <Link {...props} prefetch={false} />;
}
