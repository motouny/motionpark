namespace MotionPark.Domain;

public enum BookingStatus { Reserved, Confirmed, CheckedIn, Cancelled, NoShow, WaitingList }
public enum SubscriptionStatus { Draft, PendingPayment, Active, Paused, Expired, Cancelled }
public enum BillingCycle { Once, Monthly, Quarterly, SemiAnnual, Annual, Limited }
public enum GenderScope { Female, Male, Mixed }
public enum IntegrationStatus { Pending, Processing, Done, Error }
public enum PaymentStatus { Initiated, Success, Failed }
public enum LeadStatus { New, Contacted, Qualified, Converted, Closed }
public enum LeadType { Contact, Callback, Trial, MembershipInterest }
public enum NotificationChannel { InApp, Email, Sms, WhatsApp }
public enum NotificationStatus { Queued, Sent, Delivered, Blocked, NotConfigured, Failed }
public enum SyncJobType { PartnerSync, MembershipPlanSync, SubscriptionCreate, InvoiceSync, LeadSync, PaymentSync }
public enum MediaCategory { General, Hero, Activity, Coach, Banner, Gallery, Page, Logo }
