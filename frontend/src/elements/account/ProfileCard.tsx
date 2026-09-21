import { faCamera, faImage, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { z } from 'zod';
import { axiosInstance, httpErrorToHuman } from '@/api/axios.ts';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Avatar from '@/elements/Avatar.tsx';
import Badge from '@/elements/Badge.tsx';
import Button from '@/elements/Button.tsx';
import Card from '@/elements/Card.tsx';
import Group from '@/elements/Group.tsx';
import { Modal } from '@/elements/modals/Modal.tsx';
import Text from '@/elements/Text.tsx';
import Title from '@/elements/Title.tsx';
import UnstyledButton from '@/elements/UnstyledButton.tsx';
import { useUserSetting } from '@/lib/userSettings.ts';
import AvatarContainer from '@/pages/dashboard/account/AvatarContainer.tsx';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import { useNebulaTheme } from '../../lib/apply.ts';
import { SAFE_URL } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import BannerModal, { BANNER_API } from './BannerModal.tsx';

// the uploaded banner's URL; the panel syncs user settings across devices
const BANNER_KEY = 'nebula::account_banner';
const SHADE = 'var(--nebula-card)';

/** Profile header on the account page: the user's own banner, avatar, name, email, role and 2FA state. */
export default function ProfileCard() {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const { user } = useAuth();
  const theme = useNebulaTheme();
  const [saved, setSaved] = useUserSetting(BANNER_KEY, z.string(), '');
  const [editing, setEditing] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  if (!user) return null;

  // a user setting, so user controlled, and it lands in a CSS url(): same check as the theme's images
  const own = SAFE_URL.test(saved) ? saved : '';
  const banner = own || theme.homeBanner;
  const backgroundImage = banner
    ? `linear-gradient(0deg, color-mix(in srgb, ${SHADE} 40%, transparent), transparent 60%), url("${banner}")`
    : `linear-gradient(120deg, color-mix(in srgb, var(--mantine-color-blue-filled) 30%, ${SHADE}), ${SHADE} 75%)`;

  const twoFactor = user.twoFactorMethods.length > 0;
  // core locks its avatar card in these states, the shortcut here follows it
  const locked = user.frozen || (user.requireTwoFactor && !user.twoFactorSatisfied);

  const removeBanner = () =>
    axiosInstance
      .delete(BANNER_API)
      .then(() => setSaved(''))
      .catch((err) => addToast(httpErrorToHuman(err), 'error'));

  return (
    <Card p={0} className='nebula-profile overflow-hidden mb-4'>
      <div className='relative h-40 bg-cover bg-center' style={{ backgroundImage }}>
        <Group gap='xs' className='absolute top-3 right-3'>
          <Button
            size='xs'
            variant='default'
            leftSection={<FontAwesomeIcon icon={faImage} />}
            onClick={() => setEditing(true)}
          >
            {tExt('account.changeBanner', {})}
          </Button>
          {own && (
            <ActionIcon variant='default' aria-label={tExt('account.removeBanner', {})} onClick={removeBanner}>
              <FontAwesomeIcon icon={faXmark} />
            </ActionIcon>
          )}
        </Group>
      </div>

      <div className='flex items-start gap-4 px-6 pb-5'>
        <UnstyledButton
          className='group relative -mt-11 shrink-0 rounded-full'
          aria-label={tExt('account.changeAvatar', {})}
          disabled={locked}
          onClick={() => setAvatarOpen(true)}
        >
          <Avatar
            src={user.avatar}
            name={user.username}
            size={88}
            className='border-4 border-(--nebula-card) bg-(--nebula-card)'
          />
          <span className='absolute inset-1 flex items-center justify-center rounded-full bg-black/55 text-lg text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 group-disabled:hidden'>
            <FontAwesomeIcon icon={faCamera} />
          </span>
        </UnstyledButton>
        <div className='min-w-0 pt-3'>
          <Title order={3} className='truncate'>
            {user.username}
          </Title>
          <Text size='sm' c='dimmed' truncate>
            {user.email}
          </Text>
          <Group gap='xs' mt='xs'>
            {user.admin && (
              <Badge variant='light' color='blue' tt='none' radius='sm'>
                {tExt('account.admin', {})}
              </Badge>
            )}
            {user.role && (
              <Badge variant='light' color='gray' tt='none' radius='sm'>
                {user.role.name}
              </Badge>
            )}
            <Badge variant='light' color={twoFactor ? 'green' : 'red'} tt='none' radius='sm'>
              <span className='flex items-center gap-1.5'>
                <span className='size-1.5 rounded-full bg-current' />
                {tExt(twoFactor ? 'account.twoFactorOn' : 'account.twoFactorOff', {})}
              </span>
            </Badge>
          </Group>
        </div>
      </div>

      {/* core's own avatar card (crop, upload, remove); app.css hides the copy in the grid */}
      <Modal opened={avatarOpen} onClose={() => setAvatarOpen(false)} size='xl' padding={0} withCloseButton={false}>
        <AvatarContainer />
      </Modal>

      <BannerModal opened={editing} onClose={() => setEditing(false)} preview={backgroundImage} onSaved={setSaved} />
    </Card>
  );
}
