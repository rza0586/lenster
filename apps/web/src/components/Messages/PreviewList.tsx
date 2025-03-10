import Preview from '@components/Messages/Preview';
import Following from '@components/Profile/Following';
import Loader from '@components/Shared/Loader';
import Search from '@components/Shared/Navbar/Search';
import { MailIcon, PlusCircleIcon } from '@heroicons/react/outline';
import { Errors } from '@lenster/data/errors';
import { MESSAGES } from '@lenster/data/tracking';
import type { Profile } from '@lenster/lens';
import {
  Card,
  EmptyState,
  ErrorMessage,
  GridItemFour,
  Modal,
  TabButton
} from '@lenster/ui';
import buildConversationId from '@lib/buildConversationId';
import { buildConversationKey } from '@lib/conversationKey';
import { Leafwatch } from '@lib/leafwatch';
import { t } from '@lingui/macro';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { MessageTabs } from 'src/enums';
import useGetMessagePreviews from 'src/hooks/useGetMessagePreviews';
import { useMessageDb } from 'src/hooks/useMessageDb';
import useMessagePreviews from 'src/hooks/useMessagePreviews';
import { useAppStore } from 'src/store/app';
import type { TabValues } from 'src/store/message';
import { useMessagePersistStore, useMessageStore } from 'src/store/message';

interface PreviewListProps {
  className?: string;
  selectedConversationKey?: string;
}

const PreviewList: FC<PreviewListProps> = ({
  className,
  selectedConversationKey
}) => {
  const router = useRouter();
  const currentProfile = useAppStore((state) => state.currentProfile);
  const { persistProfile } = useMessageDb();
  const selectedTab = useMessageStore((state) => state.selectedTab);
  const ensNames = useMessageStore((state) => state.ensNames);
  const setSelectedTab = useMessageStore((state) => state.setSelectedTab);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const { authenticating, loading, messages, profilesToShow, profilesError } =
    useMessagePreviews();

  const { loading: previewsLoading, progress: previewsProgress } =
    useGetMessagePreviews();
  const clearMessagesBadge = useMessagePersistStore(
    (state) => state.clearMessagesBadge
  );

  const sortedProfiles = Array.from(profilesToShow).sort(([keyA], [keyB]) => {
    const messageA = messages.get(keyA);
    const messageB = messages.get(keyB);
    return (messageA?.sent?.getTime() || 0) >= (messageB?.sent?.getTime() || 0)
      ? -1
      : 1;
  });

  useEffect(() => {
    if (!currentProfile) {
      return;
    }
    clearMessagesBadge(currentProfile.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile]);

  const showAuthenticating = currentProfile && authenticating;
  const showLoading =
    loading && (messages.size === 0 || profilesToShow.size === 0);

  const newMessageClick = () => {
    setShowSearchModal(true);
    Leafwatch.track(MESSAGES.OPEN_NEW_CONVERSATION);
  };

  const onProfileSelected = async (profile: Profile) => {
    const conversationId = buildConversationId(currentProfile?.id, profile.id);
    const conversationKey = buildConversationKey(
      profile.ownedBy,
      conversationId
    );
    await persistProfile(conversationKey, profile);
    const selectedTab: TabValues = profile.isFollowedByMe
      ? MessageTabs.Following
      : MessageTabs.Inbox;
    setSelectedTab(selectedTab);
    router.push(`/messages/${conversationKey}`);
    setShowSearchModal(false);
  };

  return (
    <GridItemFour
      className={clsx(
        'xs:mx-2 mb-0 h-[calc(100vh-8rem)] sm:mx-2 md:col-span-4',
        className
      )}
    >
      <Card className="flex h-full flex-col justify-between">
        <div className="divider relative flex items-center justify-between p-5">
          <div className="font-bold">Messages</div>
          {currentProfile && !showAuthenticating && !showLoading ? (
            <button onClick={newMessageClick} type="button">
              <PlusCircleIcon className="h-6 w-6" />
            </button>
          ) : null}
          {previewsLoading ? (
            <progress
              className="absolute -bottom-1 left-0 h-1 w-full appearance-none border-none bg-transparent"
              value={previewsProgress}
              max={100}
            />
          ) : null}
        </div>
        <div className="flex justify-between px-4 py-3">
          <div className="flex space-x-2">
            <TabButton
              className="p-2 px-4"
              name={MessageTabs.Inbox}
              active={selectedTab === MessageTabs.Inbox}
              onClick={() => {
                setSelectedTab(MessageTabs.Inbox);
                Leafwatch.track(MESSAGES.SWITCH_INBOX_TAB);
              }}
              showOnSm
            />
            <TabButton
              className="p-2 px-4"
              name={MessageTabs.Following}
              active={selectedTab === MessageTabs.Following}
              onClick={() => {
                setSelectedTab(MessageTabs.Following);
                Leafwatch.track(MESSAGES.SWITCH_FOLLOWING_TAB);
              }}
              showOnSm
            />
          </div>
        </div>
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {showAuthenticating ? (
            <div className="flex h-full grow items-center justify-center">
              <Loader message="Awaiting signature to enable DMs" />
            </div>
          ) : showLoading ? (
            <div className="flex h-full grow items-center justify-center">
              <Loader message={t`Loading conversations`} />
            </div>
          ) : profilesError ? (
            <ErrorMessage
              className="m-5"
              title={t`Failed to load messages`}
              error={{
                message: Errors.SomethingWentWrong,
                name: Errors.SomethingWentWrong
              }}
            />
          ) : sortedProfiles.length === 0 ? (
            <button
              className="h-full w-full justify-items-center"
              onClick={newMessageClick}
              type="button"
            >
              <EmptyState
                message={t`Start messaging your Lens frens`}
                icon={<MailIcon className="text-brand h-8 w-8" />}
                hideCard
              />
            </button>
          ) : (
            <Virtuoso
              className="h-full"
              data={sortedProfiles}
              itemContent={(_, [key, profile]) => {
                const message = messages.get(key);
                return (
                  <Preview
                    ensName={ensNames.get(key)}
                    isSelected={key === selectedConversationKey}
                    key={key}
                    profile={profile}
                    conversationKey={key}
                    message={message}
                  />
                );
              }}
            />
          )}
        </div>
      </Card>
      <Modal
        title={t`New message`}
        icon={<MailIcon className="text-brand h-5 w-5" />}
        size="sm"
        show={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      >
        <div className="w-full px-4 pt-4">
          <Search
            modalWidthClassName="max-w-lg"
            placeholder={t`Search for someone to message...`}
            onProfileSelected={onProfileSelected}
          />
        </div>
        {currentProfile ? (
          <Following
            profile={currentProfile}
            onProfileSelected={onProfileSelected}
          />
        ) : null}
      </Modal>
    </GridItemFour>
  );
};

export default PreviewList;
