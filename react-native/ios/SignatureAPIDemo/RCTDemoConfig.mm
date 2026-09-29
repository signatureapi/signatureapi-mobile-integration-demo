#import <Foundation/Foundation.h>
#import <DemoConfigSpec/DemoConfigSpec.h>

/// The app's configuration for JavaScript (src/config/specs/NativeDemoConfig.ts):
/// Info.plist keys set by build settings, and launch arguments from a test runner.
@interface RCTDemoConfig : NSObject <NativeDemoConfigSpec>
@end

@implementation RCTDemoConfig

+ (NSString *)moduleName
{
  return @"DemoConfig";
}

/// An Info.plist value, such as DemoServerURL from the DEMO_SERVER_URL build setting.
- (NSString *_Nullable)buildSetting:(NSString *)name
{
  id value = [NSBundle.mainBundle objectForInfoDictionaryKey:name];
  return [value isKindOfClass:NSString.class] ? value : nil;
}

/// The value after `name` in the process arguments. Accepts `-name value`,
/// `--name value`, `--name=value` and `name value`, since test runners differ.
- (NSString *_Nullable)launchArgument:(NSString *)name
{
  NSArray<NSString *> *arguments = NSProcessInfo.processInfo.arguments;
  NSCharacterSet *dashes = [NSCharacterSet characterSetWithCharactersInString:@"-"];
  NSString *prefix = [name stringByAppendingString:@"="];
  for (NSUInteger index = 1; index < arguments.count; index++) {
    NSString *argument = [arguments[index] stringByTrimmingCharactersInSet:dashes];
    if ([argument hasPrefix:prefix]) {
      return [argument substringFromIndex:prefix.length];
    }
    if ([argument isEqualToString:name] && index + 1 < arguments.count) {
      return arguments[index + 1];
    }
  }
  return nil;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDemoConfigSpecJSI>(params);
}

@end
