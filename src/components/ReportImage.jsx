import React, { useState } from 'react';
import { FaImage } from 'react-icons/fa6';
import { resolvePublicMediaUrl } from '../utils/mediaUrl';

/** Ảnh báo cáo: resolve URL API + placeholder khi 404 / lỗi mạng. */
export default function ReportImage({ src, alt = '', className = '', onClick, ...rest }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolvePublicMediaUrl(src);

  if (!resolved || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-800/80 text-zinc-500 ${className}`}
        title="Không tải được ảnh (404). Kiểm tra BE: phục vụ static /uploads, volume Railway hoặc lưu S3."
        onClick={onClick}
      >
        <FaImage className="opacity-40 shrink-0" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      onClick={onClick}
      {...rest}
    />
  );
}
