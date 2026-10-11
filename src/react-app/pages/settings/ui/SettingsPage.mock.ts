import type { InferResponseType } from 'hono/client';
import type { RequestHandler } from 'msw';
import { HttpResponse, http } from 'msw/http';
import { delay } from 'msw/utils/delay';
import { client } from '@/react-app/shared/api';
import { createHandler } from '@/react-app/shared/lib';

export type MembersResponse = InferResponseType<(typeof client.api.members)['$get'], 200>;
export type Member = MembersResponse['members'][number];
export type Invitation = MembersResponse['invitations'][number];

const memberFixtures: Member[] = [
  {
    id: 'user-1',
    name: '新潟 花子',
    email: 'hanako@example.com',
    image: null,
    nickname: null,
    role: 'owner',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'user-2',
    name: '長岡 太郎',
    email: 'taro@example.com',
    image: null,
    nickname: 'たろ',
    role: 'member',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

const invitationFixtures: Invitation[] = [
  { email: 'jiro@example.com', invitedByUserId: 'user-1', createdAt: '2026-02-10T00:00:00.000Z' },
];

let state = {
  canManage: true,
  members: [...memberFixtures],
  invitations: [...invitationFixtures],
};

/** story ごとにストアを初期化する（`beforeEach` から呼ぶ） */
export function resetMembers(options?: {
  canManage?: boolean;
  members?: Member[];
  invitations?: Invitation[];
}): void {
  state = {
    canManage: options?.canManage ?? true,
    members: [...(options?.members ?? memberFixtures)],
    invitations: [...(options?.invitations ?? invitationFixtures)],
  };
}

const successHandlers = [
  createHandler({ path: '/api/members', method: '$get' })(() => ({
    status: 200,
    output: state,
  })),

  createHandler({ path: '/api/members', method: '$post' })(({ input }) => {
    const { email } = input.json;
    if (state.invitations.some((invitation) => invitation.email === email)) {
      return { status: 409, output: { error: 'Conflict' } };
    }

    const invitation: Invitation = {
      email,
      invitedByUserId: 'user-1',
      createdAt: '2026-10-11T07:00:00.000Z',
    };
    state = { ...state, invitations: [...state.invitations, invitation] };
    return { status: 201, output: invitation };
  }),

  createHandler({ path: '/api/members/:email', method: '$delete' })(({ input }) => {
    const { email } = input.param;
    if (!state.invitations.some((invitation) => invitation.email === email)) {
      return { status: 404, output: { error: 'Not Found' } };
    }

    state = {
      ...state,
      invitations: state.invitations.filter((invitation) => invitation.email !== email),
    };
    return { status: 200, output: { email } };
  }),
];

/** レスポンスが返らないケース（ローディング表示の確認用） */
const loadingHandlers = [
  createHandler({ path: '/api/members', method: '$get' })(async () => {
    await delay('infinite');
    return { status: 200, output: state };
  }),
];

/** route の型に存在しない status を返すため、ここだけは msw の http をそのまま使う */
const errorHandlers = [http.get('/api/members', () => new HttpResponse(null, { status: 500 }))];

/** story から使うハンドラ一式 */
export const membersHandlers = {
  success: successHandlers,
  loading: loadingHandlers,
  error: errorHandlers,
} as const satisfies Record<string, RequestHandler[]>;
