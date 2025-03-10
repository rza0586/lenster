import { PencilIcon } from '@heroicons/react/outline';
import { LensPeriphery } from '@lenster/abis';
import { LENS_PERIPHERY } from '@lenster/data/constants';
import { Errors } from '@lenster/data/errors';
import { SETTINGS } from '@lenster/data/tracking';
import type { CreatePublicSetProfileMetadataUriRequest } from '@lenster/lens';
import {
  useBroadcastMutation,
  useCreateSetProfileMetadataTypedDataMutation,
  useCreateSetProfileMetadataViaDispatcherMutation,
  useProfileSettingsQuery
} from '@lenster/lens';
import getProfileAttribute from '@lenster/lib/getProfileAttribute';
import getSignature from '@lenster/lib/getSignature';
import {
  Button,
  ErrorMessage,
  Form,
  Input,
  Spinner,
  useZodForm
} from '@lenster/ui';
import errorToast from '@lib/errorToast';
import { Leafwatch } from '@lib/leafwatch';
import uploadToArweave from '@lib/uploadToArweave';
import { t, Trans } from '@lingui/macro';
import type { FC } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from 'src/store/app';
import { useGlobalModalStateStore } from 'src/store/modals';
import { v4 as uuid } from 'uuid';
import { useContractWrite, useSignTypedData } from 'wagmi';
import { object, string } from 'zod';

import EmojiPicker from './EmojiPicker';
import Loader from './Loader';

const editStatusSchema = object({
  status: string()
    .min(1, { message: t`Status should not be empty` })
    .max(100, { message: t`Status should not exceed 100 characters` })
});

const Status: FC = () => {
  const currentProfile = useAppStore((state) => state.currentProfile);
  const setShowStatusModal = useGlobalModalStateStore(
    (state) => state.setShowStatusModal
  );
  const [isLoading, setIsLoading] = useState(false);
  const [emoji, setEmoji] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Dispatcher
  const canUseRelay = currentProfile?.dispatcher?.canUseRelay;
  const isSponsored = currentProfile?.dispatcher?.sponsor;

  const form = useZodForm({
    schema: editStatusSchema
  });

  const onCompleted = (__typename?: 'RelayError' | 'RelayerResult') => {
    if (__typename === 'RelayError') {
      return;
    }

    toast.success(t`Status updated successfully!`);
    setIsLoading(false);
    setShowStatusModal(false);
  };

  const onError = (error: any) => {
    setIsLoading(false);
    errorToast(error);
  };

  const { data, loading, error } = useProfileSettingsQuery({
    variables: { request: { profileId: currentProfile?.id } },
    skip: !currentProfile?.id,
    onCompleted: ({ profile }) => {
      form.setValue(
        'status',
        getProfileAttribute(profile?.attributes, 'statusMessage')
      );
      setEmoji(getProfileAttribute(profile?.attributes, 'statusEmoji'));
    }
  });

  const { signTypedDataAsync } = useSignTypedData({ onError });
  const { write } = useContractWrite({
    address: LENS_PERIPHERY,
    abi: LensPeriphery,
    functionName: 'setProfileMetadataURIWithSig',
    onSuccess: () => onCompleted(),
    onError
  });

  const [broadcast] = useBroadcastMutation({
    onCompleted: ({ broadcast }) => onCompleted(broadcast.__typename)
  });
  const [createSetProfileMetadataTypedData] =
    useCreateSetProfileMetadataTypedDataMutation({
      onCompleted: async ({ createSetProfileMetadataTypedData }) => {
        const { id, typedData } = createSetProfileMetadataTypedData;
        const signature = await signTypedDataAsync(getSignature(typedData));
        const { data } = await broadcast({
          variables: { request: { id, signature } }
        });
        if (data?.broadcast.__typename === 'RelayError') {
          const { profileId, metadata } = typedData.value;
          return write?.({ args: [profileId, metadata] });
        }
      },
      onError
    });

  const [createSetProfileMetadataViaDispatcher] =
    useCreateSetProfileMetadataViaDispatcherMutation({
      onCompleted: ({ createSetProfileMetadataViaDispatcher }) =>
        onCompleted(createSetProfileMetadataViaDispatcher.__typename),
      onError
    });

  const createViaDispatcher = async (
    request: CreatePublicSetProfileMetadataUriRequest
  ) => {
    const { data } = await createSetProfileMetadataViaDispatcher({
      variables: { request }
    });
    if (
      data?.createSetProfileMetadataViaDispatcher?.__typename === 'RelayError'
    ) {
      return await createSetProfileMetadataTypedData({
        variables: { request }
      });
    }
  };

  const profile = data?.profile;

  const editStatus = async (emoji: string, status: string) => {
    if (!currentProfile) {
      return toast.error(Errors.SignWallet);
    }

    try {
      setIsLoading(true);
      const id = await uploadToArweave({
        name: profile?.name ?? '',
        bio: profile?.bio ?? '',
        cover_picture:
          profile?.coverPicture?.__typename === 'MediaSet'
            ? profile?.coverPicture?.original?.url ?? ''
            : '',
        attributes: [
          ...(profile?.attributes
            ?.filter(
              (attr) =>
                ![
                  'location',
                  'website',
                  'x',
                  'statusEmoji',
                  'statusMessage',
                  'app'
                ].includes(attr.key)
            )
            .map(({ key, value }) => ({ key, value })) ?? []),
          {
            key: 'location',
            value: getProfileAttribute(profile?.attributes, 'location')
          },
          {
            key: 'website',
            value: getProfileAttribute(profile?.attributes, 'website')
          },
          {
            key: 'x',
            value: getProfileAttribute(profile?.attributes, 'x')?.replace(
              'https://x.com/',
              ''
            )
          },
          { key: 'statusEmoji', value: emoji },
          { key: 'statusMessage', value: status }
        ],
        version: '1.0.0',
        metadata_id: uuid()
      });

      const request: CreatePublicSetProfileMetadataUriRequest = {
        profileId: currentProfile?.id,
        metadata: `ar://${id}`
      };

      if (canUseRelay && isSponsored) {
        return await createViaDispatcher(request);
      }

      return await createSetProfileMetadataTypedData({
        variables: { request }
      });
    } catch (error) {
      onError(error);
    }
  };

  if (loading) {
    return (
      <div className="p-5">
        <Loader message={t`Loading status settings`} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage title={t`Failed to load status settings`} error={error} />
    );
  }

  return (
    <div onClick={() => setShowEmojiPicker(false)} className="space-y-5 p-5">
      <Form
        form={form}
        className="space-y-4"
        onSubmit={async ({ status }) => {
          await editStatus(emoji, status);
          Leafwatch.track(SETTINGS.PROFILE.SET_PICTURE);
        }}
      >
        <Input
          prefix={
            <EmojiPicker
              setShowEmojiPicker={setShowEmojiPicker}
              showEmojiPicker={showEmojiPicker}
              emoji={emoji}
              setEmoji={setEmoji}
              emojiClassName="mt-[8px]"
            />
          }
          placeholder={t`What's happening?`}
          {...form.register('status')}
        />
        <div className="ml-auto flex items-center space-x-2">
          <Button
            type="submit"
            variant="danger"
            disabled={isLoading}
            outline
            onClick={async () => {
              setEmoji('');
              form.setValue('status', '');
              await editStatus('', '');
              Leafwatch.track(SETTINGS.PROFILE.CLEAR_STATUS);
            }}
          >
            <Trans>Clear status</Trans>
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            icon={
              isLoading ? (
                <Spinner size="xs" />
              ) : (
                <PencilIcon className="h-4 w-4" />
              )
            }
          >
            <Trans>Save</Trans>
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default Status;
