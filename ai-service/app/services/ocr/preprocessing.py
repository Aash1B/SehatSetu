"""Conservative multi-variant document-image preprocessing."""

from __future__ import annotations
from dataclasses import dataclass
from io import BytesIO
from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat


@dataclass(frozen=True)
class ImageVariant:
    name: str
    payload: bytes


class ImagePreprocessor:
    def __init__(self,enabled=True,adaptive_threshold=True,deskew=True):
        self.enabled=enabled; self.adaptive_threshold=adaptive_threshold; self.deskew=deskew

    def variants(self,image:Image.Image)->list[ImageVariant]:
        oriented=ImageOps.exif_transpose(image).convert("RGB")
        if oriented.width < 1600:
            ratio=min(2.0,1600/max(1,oriented.width)); oriented=oriented.resize((int(oriented.width*ratio),int(oriented.height*ratio)),Image.Resampling.LANCZOS)
        if not self.enabled: return [ImageVariant("original_normalized",self._png(oriented))]
        gray=ImageOps.grayscale(oriented)
        normalized=ImageOps.autocontrast(gray,cutoff=1)
        values=[ImageVariant("original_normalized",self._png(normalized))]
        if self.adaptive_threshold:
            # PIL-only local threshold approximation; intentionally blended to retain glyph edges.
            background=normalized.filter(ImageFilter.GaussianBlur(radius=8))
            adaptive=Image.new("L",normalized.size,255)
            # ``get_flattened_data`` was added after Pillow 11. Use it when
            # available and retain ``getdata`` for the supported 11.x range.
            adaptive.putdata([
                0 if pixel < backdrop - 8 else 255
                for pixel, backdrop in zip(
                    self._pixels(normalized),
                    self._pixels(background),
                )
            ])
            values.append(ImageVariant("adaptive_threshold",self._png(Image.blend(normalized,adaptive,.65))))
        contrast=ImageEnhance.Contrast(normalized).enhance(1.65)
        contrast=self._deskew(contrast) if self.deskew else contrast
        values.append(ImageVariant("high_contrast_deskew",self._png(ImageOps.expand(contrast,border=8,fill="white"))))
        denoised=normalized.filter(ImageFilter.MedianFilter(3)); denoised=ImageEnhance.Sharpness(denoised).enhance(1.2)
        values.append(ImageVariant("noise_reduction",self._png(denoised)))
        # Avoid duplicate payloads for already-clean images.
        unique={};
        for value in values: unique.setdefault(value.payload,value)
        return list(unique.values())

    def process(self,image:Image.Image)->bytes:
        return self.variants(image)[0].payload

    @staticmethod
    def _deskew(image:Image.Image)->Image.Image:
        # Small-angle projection search avoids aggressive rotation and external CV dependencies.
        best=image; best_score=-1.0
        for angle in (-3,-2,-1,0,1,2,3):
            candidate=image.rotate(angle,Image.Resampling.BICUBIC,expand=True,fillcolor=255)
            thumbnail=candidate.copy(); thumbnail.thumbnail((600,600))
            rows=[sum(255-value for value in thumbnail.crop((0,y,thumbnail.width,y+1)).tobytes()) for y in range(thumbnail.height)]
            mean=sum(rows)/max(1,len(rows)); score=sum((row-mean)**2 for row in rows)/max(1,len(rows))
            if score>best_score: best,best_score=candidate,score
        return best

    @staticmethod
    def _png(image):
        stream=BytesIO(); image.save(stream,format="PNG",optimize=True); return stream.getvalue()

    @staticmethod
    def _pixels(image: Image.Image):
        flattened = getattr(image, "get_flattened_data", None)
        return flattened() if flattened is not None else image.getdata()
