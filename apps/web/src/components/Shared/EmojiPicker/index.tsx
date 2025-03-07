import { EmojiHappyIcon } from '@heroicons/react/outline';
import stopEventPropagation from '@lenster/lib/stopEventPropagation';
import { Tooltip } from '@lenster/ui';
import { t } from '@lingui/macro';
import clsx from 'clsx';
import { type Dispatch, type FC, type SetStateAction, useRef } from 'react';
import { useOnClickOutside } from 'usehooks-ts';

import List from './List';

interface EmojiPickerProps {
  emoji?: string | null;
  setEmoji: (emoji: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: Dispatch<SetStateAction<boolean>>;
  emojiClassName?: string;
}

const EmojiPicker: FC<EmojiPickerProps> = ({
  emoji,
  setEmoji,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiClassName
}) => {
  const listRef = useRef(null);

  useOnClickOutside(listRef, () => setShowEmojiPicker(false));

  return (
    <div ref={listRef} className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          stopEventPropagation(e);
          setShowEmojiPicker(!showEmojiPicker);
        }}
        className="cursor-pointer"
      >
        {emoji ? (
          <span>{emoji}</span>
        ) : (
          <Tooltip placement="top" content={t`Emoji`}>
            <EmojiHappyIcon className={clsx('h-5 w-5', emojiClassName)} />
          </Tooltip>
        )}
      </button>
      {showEmojiPicker ? (
        <div className="absolute z-[5] mt-1 w-2/4 w-[300px] rounded-xl border bg-white shadow-sm focus:outline-none dark:border-gray-700 dark:bg-gray-900">
          <List setEmoji={setEmoji} />
        </div>
      ) : null}
    </div>
  );
};

export default EmojiPicker;
