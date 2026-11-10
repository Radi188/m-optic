//
//  PhotoCardComposer.swift
//  MOpticVTO
//
//  The saved try-on photo, built the way the website builds it
//  (VirtualTryOnR3F.takePhoto + photoCard.ts):
//
//    1. the camera photo, aspect-filled into the analysed-frame "cover box";
//    2. cropped to the window the screen shows;
//    3. the glasses (a snapshot of the GL view, which renders exactly that
//       window) drawn on top;
//    4. the whole composite mirrored once, like the on-screen selfie view;
//    5. put on a white card with the M-Optic mark, the frame name and colour.
//
//  The card proportions are photoCard.ts's FALLBACK set (fractions of the photo
//  width), since there is no DOM card to measure on native. The review screen
//  shows this same file, so what the wearer approves is what gets saved.
//

import Foundation
import NitroModules
import UIKit

enum PhotoCardComposer {
  // photoCard.ts FALLBACK — proportions of the photo width.
  private static let pad = 0.045
  private static let logo = 0.075
  private static let title = 0.038
  private static let subtitle = 0.03
  private static let gapAfterPhoto = 0.05
  private static let gapAfterLogo = 0.035
  private static let gapBetweenLines = 0.018
  /// photoCard.ts EXPORT_LINE_GAP_PX (scale 1 in the fallback path).
  private static let exportLineGap = 6.0

  private static let titleColor = UIColor(red: 16 / 255, green: 26 / 255, blue: 51 / 255, alpha: 1)
  private static let subtitleColor = UIColor(red: 16 / 255, green: 26 / 255, blue: 51 / 255, alpha: 0.6)
  private static let borderColor = UIColor(white: 0, alpha: 0.1)

  static func compose(_ r: PhotoCardRequest) throws -> PhotoCardResult {
    let viewW = max(1, Int(r.viewWidth.rounded()))
    let viewH = max(1, Int(r.viewHeight.rounded()))
    let coverW = max(1, r.coverWidth)
    let coverH = max(1, r.coverHeight)

    guard let photo = UIImage(contentsOfFile: stripScheme(r.photoPath)) else {
      throw RuntimeError.error(withMessage: "Could not read the camera photo at \(r.photoPath)")
    }
    let upright = uprightPhoto(photo, orientation: r.photoOrientation, mirrored: r.photoMirrored,
                               wantPortrait: coverH >= coverW)
    let overlay = r.overlayPath.isEmpty ? nil : UIImage(contentsOfFile: stripScheme(r.overlayPath))

    // ── 1–4: the shot, at the GL view's own resolution ──────────────────────
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let shot = UIGraphicsImageRenderer(size: CGSize(width: viewW, height: viewH), format: format).image { ctx in
      let cg = ctx.cgContext
      if r.mirror {
        cg.translateBy(x: CGFloat(viewW), y: 0)
        cg.scaleBy(x: -1, y: 1)
      }
      // Aspect-fill the photo into the cover box (object-fit: cover), then
      // shift so the visible window lands at the origin.
      let pw = upright.size.width
      let ph = upright.size.height
      let s = max(coverW / Double(pw), coverH / Double(ph))
      let dw = Double(pw) * s
      let dh = Double(ph) * s
      let dx = (coverW - dw) / 2 - r.viewX
      let dy = (coverH - dh) / 2 - r.viewY
      upright.draw(in: CGRect(x: dx, y: dy, width: dw, height: dh))
      overlay?.draw(in: CGRect(x: 0, y: 0, width: viewW, height: viewH))
    }

    // ── 5: the card ─────────────────────────────────────────────────────────
    let w = Double(viewW)
    let h = Double(viewH)
    let padPx = (w * pad).rounded()
    let titleSize = max(15, (w * title).rounded())
    let subtitleSize = max(12, (w * subtitle).rounded())
    let logoBox = max(28, (w * logo).rounded())
    let captionMarginTop = (w * gapAfterPhoto).rounded()
    let captionGap = (w * gapAfterLogo).rounded()
    let subtitleMarginTop = (w * gapBetweenLines).rounded() + exportLineGap

    let logoImage = loadLogo()
    let hasLogo = logoImage != nil
    let titleText = r.title.trimmingCharacters(in: .whitespacesAndNewlines)
    let subtitleText = r.subtitle.trimmingCharacters(in: .whitespacesAndNewlines)
    let hasTitle = !titleText.isEmpty
    let hasSubtitle = !subtitleText.isEmpty

    var captionHeight = 0.0
    if hasLogo || hasTitle || hasSubtitle { captionHeight += captionMarginTop }
    if hasLogo { captionHeight += logoBox }
    if hasLogo && (hasTitle || hasSubtitle) { captionHeight += captionGap }
    if hasTitle { captionHeight += titleSize }
    if hasSubtitle { captionHeight += (hasTitle ? subtitleMarginTop : 0) + subtitleSize }

    let cardW = w + padPx * 2
    let cardH = padPx + h + captionHeight + padPx

    let card = UIGraphicsImageRenderer(size: CGSize(width: cardW, height: cardH), format: format).image { ctx in
      UIColor.white.setFill()
      ctx.fill(CGRect(x: 0, y: 0, width: cardW, height: cardH))
      shot.draw(in: CGRect(x: padPx, y: padPx, width: w, height: h))

      // Hairline on the photo's own edge, like the CSS border on the preview.
      let border = 1.0
      borderColor.setStroke()
      let path = UIBezierPath(rect: CGRect(x: padPx + border / 2, y: padPx + border / 2,
                                           width: w - border, height: h - border))
      path.lineWidth = border
      path.stroke()

      let centerX = cardW / 2
      var y = padPx + h + captionMarginTop

      if let logoImage {
        // object-contain inside the logo box.
        let src = logoImage.size.width / max(logoImage.size.height, 1)
        let drawW = src > 1 ? logoBox : (logoBox * src).rounded()
        let drawH = src > 1 ? (logoBox / src).rounded() : logoBox
        logoImage.draw(in: CGRect(x: centerX - drawW / 2, y: y + (logoBox - drawH) / 2, width: drawW, height: drawH))
        y += logoBox
        if hasTitle || hasSubtitle { y += captionGap }
      }

      if hasTitle {
        drawCentered(titleText, font: font(r.boldFontFamily, size: titleSize, weight: .medium),
                     color: titleColor, y: y, width: cardW, inset: padPx, lineHeight: titleSize)
        y += titleSize + subtitleMarginTop
      }
      if hasSubtitle {
        drawCentered(subtitleText, font: font(r.fontFamily, size: subtitleSize, weight: .regular),
                     color: subtitleColor, y: y, width: cardW, inset: padPx, lineHeight: subtitleSize)
      }
    }

    let quality = CGFloat(min(max(r.jpegQuality, 0.1), 1))
    guard let data = card.jpegData(compressionQuality: quality) else {
      throw RuntimeError.error(withMessage: "Could not encode the photo card.")
    }
    let out = stripScheme(r.outputPath)
    try FileManager.default.createDirectory(at: URL(fileURLWithPath: out).deletingLastPathComponent(),
                                            withIntermediateDirectories: true)
    try data.write(to: URL(fileURLWithPath: out), options: .atomic)
    return PhotoCardResult(path: out, width: cardW, height: cardH)
  }

  // MARK: - Helpers

  private static func stripScheme(_ path: String) -> String {
    if path.hasPrefix("file://") { return URL(string: path)?.path ?? String(path.dropFirst(7)) }
    return path
  }

  /// The photo, upright and unmirrored. UIImage applies EXIF orientation; if
  /// the result still disagrees with the screen (portrait), the capture's own
  /// orientation metadata is applied on top.
  private static func uprightPhoto(_ image: UIImage, orientation: String, mirrored: Bool,
                                   wantPortrait: Bool) -> UIImage {
    var result = redraw(image)
    let isPortrait = result.size.height >= result.size.width
    if isPortrait != wantPortrait, let cg = result.cgImage {
      let o: UIImage.Orientation
      switch orientation {
      case "left": o = .left
      case "right": o = .right
      case "down": o = .down
      default: o = .right
      }
      result = redraw(UIImage(cgImage: cg, scale: 1, orientation: o))
    }
    if mirrored, let cg = result.cgImage {
      result = redraw(UIImage(cgImage: cg, scale: 1, orientation: .upMirrored))
    }
    return result
  }

  /// Bakes the image's orientation into its pixels (scale 1).
  private static func redraw(_ image: UIImage) -> UIImage {
    if image.imageOrientation == .up, image.scale == 1 { return image }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let size = CGSize(width: image.size.width * image.scale, height: image.size.height * image.scale)
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
  }

  private static var cachedLogo: UIImage?
  private static func loadLogo() -> UIImage? {
    if let cachedLogo { return cachedLogo }
    for bundle in [Bundle.main, Bundle(for: HybridVtoFactory.self)] {
      if let url = bundle.url(forResource: "MOpticVTO", withExtension: "bundle"),
         let resources = Bundle(url: url),
         let path = resources.path(forResource: "photo_card_logo", ofType: "png"),
         let image = UIImage(contentsOfFile: path) {
        cachedLogo = image
        return image
      }
    }
    return nil
  }

  private static func font(_ family: String, size: Double, weight: UIFont.Weight) -> UIFont {
    if !family.isEmpty, let f = UIFont(name: family, size: size) { return f }
    return UIFont.systemFont(ofSize: size, weight: weight)
  }

  private static func drawCentered(_ text: String, font: UIFont, color: UIColor, y: Double,
                                   width: Double, inset: Double, lineHeight: Double) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.lineBreakMode = .byTruncatingTail
    let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: paragraph]
    // Canvas `textBaseline = 'top'` puts the em box at y; give the line enough
    // room for Khmer's tall stacks without moving the baseline down.
    let rect = CGRect(x: inset, y: y, width: width - inset * 2, height: max(lineHeight, font.lineHeight) * 1.4)
    (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                            attributes: attrs, context: nil)
  }
}
