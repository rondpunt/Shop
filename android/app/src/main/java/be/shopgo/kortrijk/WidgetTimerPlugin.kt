package be.shopgo.kortrijk

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetTimer")
class WidgetTimerPlugin : Plugin() {

    @PluginMethod
    fun startTimer(call: PluginCall) {
        val endsAt = call.getString("endsAt")
        val address = call.getString("address") ?: "Shop & Go"

        val context = context
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("_cap_active_ends_at", endsAt)
            putString("_cap_active_address", address)
            apply()
        }

        // Trigger widget update
        val intent = Intent(context, ShopGoWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
                ComponentName(context, ShopGoWidgetProvider::class.java)
            )
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)

        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun stopTimer(call: PluginCall) {
        val context = context
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        prefs.edit().apply {
            remove("_cap_active_ends_at")
            remove("_cap_active_address")
            apply()
        }

        // Trigger widget update
        val intent = Intent(context, ShopGoWidgetProvider::class.java).apply {
            action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(
                ComponentName(context, ShopGoWidgetProvider::class.java)
            )
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
        }
        context.sendBroadcast(intent)

        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }
}
