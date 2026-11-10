require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "MOpticVTO"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "16.4" }
  s.source       = { :git => "https://m-eyewear.com", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
  ]
  # The model and the photo-card mark, in their own bundle so they cannot
  # clash with app resources.
  s.resource_bundles = {
    "MOpticVTO" => ["assets/face_landmarker.task", "assets/photo_card_logo.png"],
  }
  s.frameworks = ["AVFoundation", "CoreMedia", "UIKit"]

  load "nitrogen/generated/ios/MOpticVTO+autolinking.rb"
  add_nitrogen_files(s)

  # Same MediaPipe release as the website (@mediapipe/tasks-vision 0.10.35).
  s.dependency "MediaPipeTasksVision", "0.10.35"
  s.dependency "VisionCamera"
  s.dependency "React-jsi"
  s.dependency "React-callinvoker"
  install_modules_dependencies(s)
end
